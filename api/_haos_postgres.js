import crypto from 'node:crypto';

let poolPromise;

const AUTH_FUNCTIONS = new Set([
  'loginAccount',
  'loginAccountFastV730',
  'loginWithAutoDeviceV731',
  'registerAutoLoginDeviceV731',
  'getMyAutoLoginDevicesV731',
  'setAutoLoginDeviceActiveV731',
  'revokeAutoLoginDeviceV731',
  'getMyUserProfilesV729',
  'setActiveUserProfileV729'
]);

const NOTIFICATION_FUNCTIONS = new Set([
  'getNotifications',
  'getNotificationCenter',
  'markNotifAsRead',
  'markAllNotificationsAsRead',
  'deleteNotification'
]);

function truthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

function postgresAuthEnabled() {
  return truthy(process.env.HAOS_POSTGRES_PHASE1_ENABLED) || truthy(process.env.HAOS_POSTGRES_AUTH_ENABLED);
}

function postgresNotificationsEnabled() {
  return truthy(process.env.HAOS_POSTGRES_NOTIFICATIONS_ENABLED);
}

function shouldHandle(fn) {
  if (!process.env.DATABASE_URL) return false;
  if (AUTH_FUNCTIONS.has(fn)) return postgresAuthEnabled();
  if (NOTIFICATION_FUNCTIONS.has(fn)) return postgresNotificationsEnabled();
  return false;
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = import('pg').then((pgModule) => {
      const Pool = pgModule.Pool || pgModule.default?.Pool;
      if (!Pool) throw new Error('pg Pool export was not found');
      const sslRequired = truthy(process.env.PGSSLMODE === 'require' ? 'true' : '') || /sslmode=require/i.test(process.env.DATABASE_URL || '');
      return new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.PG_POOL_MAX || 4),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 8_000,
        ssl: sslRequired ? { rejectUnauthorized: false } : undefined
      });
    });
  }
  return poolPromise;
}

async function withClient(work) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

function cleanPhone(phone) {
  return String(phone || '').replace(/'/g, '').trim();
}

function normalizeProfileRole(role) {
  const text = String(role || '').trim();
  if (/^(head|department_head)$/i.test(text) || /หัวหน้า/.test(text)) return 'Head';
  if (/^(acting head|acting_head)$/i.test(text)) return 'Acting Head';
  if (/^coordinator$/i.test(text) || /ประสาน/.test(text)) return 'Coordinator';
  if (/^(admin|super admin)$/i.test(text)) return text;
  return text || 'Member';
}

function effectiveRole(accountRole, profileRole, canApprove) {
  const account = String(accountRole || 'User');
  const profile = normalizeProfileRole(profileRole);
  if (/^Super Admin$/i.test(account)) return 'Super Admin';
  if (/^Admin$/i.test(account)) return 'Admin';
  if (profile === 'Head' || profile === 'Acting Head' || canApprove === true) return 'Head';
  return 'User';
}

function formatBangkok(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date).replace(',', '');
}

function jsonPreference(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function profileFromRow(row, accountRole) {
  const profileRole = normalizeProfileRole(row.profile_role);
  const canApprove = row.can_approve === true;
  return {
    profileId: row.profile_id || '',
    phone: cleanPhone(row.user_phone),
    fullName: row.full_name_snapshot || '',
    department: row.department_name || '',
    position: row.position || '',
    profileRole,
    isPrimary: row.is_primary === true,
    isActive: row.is_active !== false,
    canApprove,
    signatureId: row.signature_id || '',
    notifyEmail: row.notify_email || '',
    notifyTelegram: row.notify_telegram || '',
    createdAt: formatBangkok(row.created_at),
    updatedAt: formatBangkok(row.updated_at),
    updatedBy: cleanPhone(row.updated_by_phone),
    notes: row.notes || '',
    accountRole: accountRole || 'User',
    effectiveRole: effectiveRole(accountRole, profileRole, canApprove)
  };
}

function deviceFromRow(row) {
  return {
    deviceId: row.device_id || '',
    phone: cleanPhone(row.user_phone),
    deviceLabel: row.device_label || '',
    userAgent: row.user_agent || '',
    createdAt: formatBangkok(row.created_at),
    lastUsedAt: formatBangkok(row.last_used_at),
    expiresAt: formatBangkok(row.expires_at),
    isActive: row.is_active !== false,
    revokedAt: formatBangkok(row.revoked_at),
    revokedBy: cleanPhone(row.revoked_by_phone),
    notes: row.notes || ''
  };
}

function notificationFromRow(row) {
  return {
    id: row.notification_id || '',
    message: row.message || '',
    isRead: row.is_read === true,
    time: formatBangkok(row.created_at),
    type: row.type || '',
    entityId: row.entity_id || '',
    priority: row.priority || 'Normal',
    emailStatus: row.email_status || '',
    module: row.module || 'system',
    action: row.action || 'openNotification',
    readAt: formatBangkok(row.read_at),
    virtual: false
  };
}

function verifyPbkdf2(pin, storedHash) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = Buffer.from(parts[3], 'base64');
  if (!iterations || !salt || !expected.length) return false;
  const actual = crypto.pbkdf2Sync(String(pin || ''), salt, iterations, expected.length, 'sha256');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function verifyPin(pin, user) {
  const algorithm = String(user.pin_hash_algorithm || '').toLowerCase();
  if (algorithm === 'pbkdf2_sha256') return verifyPbkdf2(pin, user.pin_hash);
  if (algorithm === 'plain' && truthy(process.env.HAOS_ALLOW_PLAIN_PIN_VERIFY)) {
    return String(pin || '') === String(user.pin_hash || '');
  }
  return false;
}

function hashDeviceToken(deviceId, token) {
  return crypto.createHash('sha256').update(String(deviceId || '') + '|' + String(token || ''), 'utf8').digest('hex');
}

async function getUserByPhone(client, phone) {
  const target = cleanPhone(phone);
  const result = await client.query('select * from public.users where phone = $1 limit 1', [target]);
  return result.rows[0] || null;
}

async function getProfilesForUser(client, user) {
  const result = await client.query(
    `select * from public.user_profiles
     where user_id = $1 and is_active = true
     order by is_primary desc, created_at asc, profile_id asc`,
    [user.user_id]
  );
  return result.rows.map((row) => profileFromRow(row, user.account_role || 'User'));
}

function chooseActiveProfile(user, profiles) {
  if (!profiles.length) return null;
  const activeId = String(user.active_profile_id || '').trim();
  return profiles.find((profile) => String(profile.profileId) === activeId)
    || profiles.find((profile) => profile.isPrimary)
    || profiles[0];
}

async function buildUserData(client, user) {
  const profiles = await getProfilesForUser(client, user);
  const activeProfile = chooseActiveProfile(user, profiles);
  const base = {
    phone: cleanPhone(user.phone),
    fullName: user.full_name || '',
    position: user.position || '',
    department: user.department_name || '',
    email: user.email || '',
    role: user.account_role || 'User',
    accountRole: user.account_role || 'User',
    emailNotify: user.email_notify === false ? 'Off' : 'On',
    accountStatus: user.account_status || 'Active',
    emailNotifyPreferences: jsonPreference(user.email_notify_preferences)
  };
  if (activeProfile) {
    base.activeProfileId = activeProfile.profileId;
    base.activeProfile = activeProfile;
    base.department = activeProfile.department || base.department;
    base.position = activeProfile.position || base.position;
    base.profileRole = activeProfile.profileRole || 'Member';
    base.canApproveProfile = !!activeProfile.canApprove;
    base.role = activeProfile.effectiveRole || effectiveRole(base.accountRole, activeProfile.profileRole, activeProfile.canApprove);
  }
  base.profiles = profiles;
  return { userData: base, activeProfile };
}

async function logAudit(client, user, action, entityType, entityId, summary, afterJson) {
  try {
    await client.query(
      `insert into public.audit_logs
       (actor_user_id, actor_phone, actor_name, actor_profile_id, action, entity_type, entity_id, summary, after_json)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        user?.user_id || null,
        cleanPhone(user?.phone),
        user?.full_name || '',
        afterJson?.activeProfileId || null,
        action,
        entityType,
        entityId,
        summary,
        JSON.stringify(afterJson || {})
      ]
    );
  } catch (err) {
    console.warn('[HAOS Postgres] audit log skipped:', err?.message || err);
  }
}

async function loginWithPin(client, phone, pin, version) {
  const started = Date.now();
  const user = await getUserByPhone(client, phone);
  if (!user || !verifyPin(pin, user)) {
    return { success: false, message: 'ข้อมูลไม่ถูกต้อง', version };
  }
  const status = user.account_status || 'Active';
  if (status === 'Pending') return { success: false, message: 'บัญชีนี้อยู่ระหว่างรออนุมัติ', version };
  if (status === 'Rejected') return { success: false, message: 'บัญชีนี้ไม่ได้รับการอนุมัติ', version };
  if (status === 'Inactive') return { success: false, message: 'บัญชีนี้ถูกปิดใช้งาน', version };

  await client.query('update public.users set last_login_at = now() where user_id = $1', [user.user_id]);
  const built = await buildUserData(client, user);
  built.userData.loginVersion = version;
  built.userData.loginMs = Date.now() - started;
  await logAudit(client, user, 'LOGIN', 'User', cleanPhone(user.phone), 'เข้าสู่ระบบสำเร็จ', {
    activeProfileId: built.activeProfile?.profileId || '',
    auditProfile: built.activeProfile || null
  });
  return { success: true, userData: built.userData, activeProfile: built.activeProfile, version };
}

async function handleLogin(args, version) {
  return withClient((client) => loginWithPin(client, args[0], args[1], version));
}

async function handleLoginWithAutoDevice(args) {
  const [deviceIdRaw, tokenRaw] = args;
  const deviceId = String(deviceIdRaw || '').trim();
  const token = String(tokenRaw || '').trim();
  const tokenHash = hashDeviceToken(deviceId, token);
  return withClient(async (client) => {
    const found = await client.query(
      `select d.*, u.*
       from public.auto_login_devices d
       join public.users u on u.user_id = d.user_id
       where d.device_id = $1 and d.token_hash = $2 and d.is_active = true
       limit 1`,
      [deviceId, tokenHash]
    );
    const row = found.rows[0];
    if (!row) return { success: false, message: 'Remembered device was not found.', version: 'postgres-auto-login' };
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return { success: false, message: 'Remembered device has expired.', version: 'postgres-auto-login' };
    }
    await client.query('update public.auto_login_devices set last_used_at = now() where auto_login_device_id = $1', [row.auto_login_device_id]);
    await client.query('update public.users set last_login_at = now() where user_id = $1', [row.user_id]);
    const user = await getUserByPhone(client, row.phone);
    const built = await buildUserData(client, user);
    built.userData.loginVersion = 'postgres-auto-login';
    await logAudit(client, user, 'AUTO_LOGIN', 'AutoLoginDevice', deviceId, 'เข้าสู่ระบบอัตโนมัติสำเร็จ', {
      activeProfileId: built.activeProfile?.profileId || '',
      deviceId
    });
    return { success: true, userData: built.userData, device: deviceFromRow(row), version: 'postgres-auto-login' };
  });
}

async function handleRegisterAutoLoginDevice(args) {
  const [phone, pin, deviceIdRaw, tokenRaw, deviceLabelRaw, userAgentRaw] = args;
  const deviceId = String(deviceIdRaw || '').trim();
  const token = String(tokenRaw || '').trim();
  if (!deviceId || token.length < 24) return { success: false, message: 'Missing device token.', version: 'postgres-auto-login' };
  return withClient(async (client) => {
    const login = await loginWithPin(client, phone, pin, 'postgres-register-auto-login');
    if (!login.success) return login;
    const user = await getUserByPhone(client, phone);
    const expires = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const tokenHash = hashDeviceToken(deviceId, token);
    const saved = await client.query(
      `insert into public.auto_login_devices
       (device_id, user_id, user_phone, device_label, token_hash, user_agent, created_at, last_used_at, expires_at, is_active, notes)
       values ($1, $2, $3, $4, $5, $6, now(), now(), $7, true, 'remember-device')
       on conflict (user_id, device_id) do update set
         device_label = excluded.device_label,
         token_hash = excluded.token_hash,
         user_agent = excluded.user_agent,
         last_used_at = now(),
         expires_at = excluded.expires_at,
         is_active = true,
         revoked_at = null,
         revoked_by_phone = null,
         updated_at = now()
       returning *`,
      [
        deviceId,
        user.user_id,
        cleanPhone(user.phone),
        String(deviceLabelRaw || 'This device').slice(0, 120),
        tokenHash,
        String(userAgentRaw || '').slice(0, 300),
        expires
      ]
    );
    await logAudit(client, user, 'REGISTER_AUTO_LOGIN_DEVICE', 'AutoLoginDevice', deviceId, 'Registered remembered device', {
      deviceLabel: deviceLabelRaw || 'This device',
      expiresAt: expires.toISOString()
    });
    return { success: true, message: 'Remembered device registered.', userData: login.userData, device: deviceFromRow(saved.rows[0]), version: 'postgres-auto-login' };
  });
}

async function handleGetAutoLoginDevices(args) {
  const phone = cleanPhone(args[0]);
  return withClient(async (client) => {
    const user = await getUserByPhone(client, phone);
    if (!user) return { success: false, message: 'ไม่พบบัญชีผู้ใช้', data: [], version: 'postgres-auto-login' };
    const result = await client.query(
      `select * from public.auto_login_devices
       where user_id = $1
       order by is_active desc, last_used_at desc nulls last, created_at desc`,
      [user.user_id]
    );
    return { success: true, data: result.rows.map(deviceFromRow), devices: result.rows.map(deviceFromRow), version: 'postgres-auto-login' };
  });
}

async function handleSetAutoLoginDeviceActive(args) {
  const [phoneRaw, deviceIdRaw, isActiveRaw, tokenRaw] = args;
  const phone = cleanPhone(phoneRaw);
  const deviceId = String(deviceIdRaw || '').trim();
  const isActive = isActiveRaw === true || String(isActiveRaw).toLowerCase() === 'true';
  return withClient(async (client) => {
    const user = await getUserByPhone(client, phone);
    if (!user) return { success: false, message: 'ไม่พบบัญชีผู้ใช้', version: 'postgres-auto-login' };
    const values = isActive && tokenRaw
      ? [isActive, null, null, hashDeviceToken(deviceId, tokenRaw), user.user_id, deviceId]
      : [isActive, isActive ? null : new Date(), isActive ? null : phone, null, user.user_id, deviceId];
    await client.query(
      `update public.auto_login_devices
       set is_active = $1,
           revoked_at = $2,
           revoked_by_phone = $3,
           token_hash = coalesce($4, token_hash),
           updated_at = now()
       where user_id = $5 and device_id = $6`,
      values
    );
    await logAudit(client, user, isActive ? 'ENABLE_AUTO_LOGIN_DEVICE' : 'DISABLE_AUTO_LOGIN_DEVICE', 'AutoLoginDevice', deviceId, isActive ? 'Enabled remembered device' : 'Disabled remembered device', { deviceId, isActive });
    return handleGetAutoLoginDevices([phone]);
  });
}

async function handleGetMyProfiles(args) {
  const phone = cleanPhone(args[0]);
  return withClient(async (client) => {
    const user = await getUserByPhone(client, phone);
    if (!user) return { success: false, message: 'ไม่พบบัญชีผู้ใช้', profiles: [], version: 'postgres-user-profiles' };
    const profiles = await getProfilesForUser(client, user);
    const activeProfile = chooseActiveProfile(user, profiles);
    return { success: true, profiles, activeProfileId: activeProfile?.profileId || '', activeProfile, version: 'postgres-user-profiles' };
  });
}

async function handleSetActiveProfile(args) {
  const phone = cleanPhone(args[0]);
  const profileId = String(args[1] || '').trim();
  return withClient(async (client) => {
    const user = await getUserByPhone(client, phone);
    if (!user) return { success: false, message: 'ไม่พบบัญชีผู้ใช้', version: 'postgres-user-profiles' };
    const profile = await client.query(
      'select * from public.user_profiles where user_id = $1 and profile_id = $2 and is_active = true limit 1',
      [user.user_id, profileId]
    );
    if (!profile.rows[0]) return { success: false, message: 'ไม่พบโปรไฟล์นี้ หรือโปรไฟล์ถูกปิดใช้งาน', version: 'postgres-user-profiles' };
    await client.query('update public.users set active_profile_id = $1 where user_id = $2', [profileId, user.user_id]);
    const freshUser = { ...user, active_profile_id: profileId };
    const built = await buildUserData(client, freshUser);
    await logAudit(client, freshUser, 'SWITCH_PROFILE', 'UserProfile', profileId, 'สลับโปรไฟล์การทำงาน', { activeProfileId: profileId });
    return { success: true, message: 'สลับโปรไฟล์แล้ว', profile: built.activeProfile, userData: built.userData, version: 'postgres-user-profiles' };
  });
}

async function handleGetNotifications(args, center) {
  const phone = cleanPhone(args[0]);
  const filter = String(args[1] || '').trim();
  const limit = Math.max(1, Math.min(Number(process.env.HAOS_NOTIFICATIONS_LIMIT || 100), 300));
  return withClient(async (client) => {
    const clauses = ['target_phone = $1'];
    const params = [phone];
    if (!center) clauses.push('is_read = false');
    if (center && filter === 'unread') clauses.push('is_read = false');
    if (center && filter === 'read') clauses.push('is_read = true');
    params.push(limit);
    const result = await client.query(
      `select * from public.notifications
       where ${clauses.join(' and ')}
       order by created_at desc
       limit $${params.length}`,
      params
    );
    const items = result.rows.map(notificationFromRow);
    if (!center) return { success: true, data: items, version: 'postgres-notifications' };
    const unread = await client.query('select count(*)::int as count from public.notifications where target_phone = $1 and is_read = false', [phone]);
    return { success: true, data: items, unread: unread.rows[0]?.count || 0, version: 'postgres-notifications' };
  });
}

async function handleMarkNotificationAsRead(args) {
  const id = String(args[0] || '').trim();
  if (id.startsWith('TODAY-')) return { success: true, virtual: true };
  return withClient(async (client) => {
    const result = await client.query(
      'update public.notifications set is_read = true, read_at = coalesce(read_at, now()), updated_at = now() where notification_id = $1',
      [id]
    );
    return { success: result.rowCount > 0, version: 'postgres-notifications' };
  });
}

async function handleMarkAllNotificationsAsRead(args) {
  const phone = cleanPhone(args[0]);
  return withClient(async (client) => {
    const result = await client.query(
      'update public.notifications set is_read = true, read_at = coalesce(read_at, now()), updated_at = now() where target_phone = $1 and is_read = false',
      [phone]
    );
    return { success: true, message: `อ่านทั้งหมดแล้ว (${result.rowCount})`, version: 'postgres-notifications' };
  });
}

async function handleDeleteNotification(args) {
  const id = String(args[0] || '').trim();
  const phone = cleanPhone(args[1]);
  if (id.startsWith('TODAY-')) return { success: true, virtual: true };
  return withClient(async (client) => {
    const result = await client.query(
      'delete from public.notifications where notification_id = $1 and target_phone = $2',
      [id, phone]
    );
    return { success: result.rowCount > 0, message: result.rowCount > 0 ? 'ลบแจ้งเตือนแล้ว' : 'ไม่พบแจ้งเตือน', version: 'postgres-notifications' };
  });
}

export async function tryHandlePostgresRequest(fn, args) {
  if (!shouldHandle(fn)) return null;
  try {
    if (fn === 'loginAccount') return await handleLogin(args, 'postgres-login');
    if (fn === 'loginAccountFastV730') return await handleLogin(args, 'postgres-login-fast');
    if (fn === 'loginWithAutoDeviceV731') return await handleLoginWithAutoDevice(args);
    if (fn === 'registerAutoLoginDeviceV731') return await handleRegisterAutoLoginDevice(args);
    if (fn === 'getMyAutoLoginDevicesV731') return await handleGetAutoLoginDevices(args);
    if (fn === 'setAutoLoginDeviceActiveV731') return await handleSetAutoLoginDeviceActive(args);
    if (fn === 'revokeAutoLoginDeviceV731') return await handleSetAutoLoginDeviceActive([args[0], args[1], false]);
    if (fn === 'getMyUserProfilesV729') return await handleGetMyProfiles(args);
    if (fn === 'setActiveUserProfileV729') return await handleSetActiveProfile(args);
    if (fn === 'getNotifications') return await handleGetNotifications(args, false);
    if (fn === 'getNotificationCenter') return await handleGetNotifications(args, true);
    if (fn === 'markNotifAsRead') return await handleMarkNotificationAsRead(args);
    if (fn === 'markAllNotificationsAsRead') return await handleMarkAllNotificationsAsRead(args);
    if (fn === 'deleteNotification') return await handleDeleteNotification(args);
    return null;
  } catch (err) {
    console.warn(`[HAOS Postgres] ${fn} failed; falling back to Apps Script:`, err?.message || err);
    if (truthy(process.env.HAOS_POSTGRES_STRICT)) {
      return { success: false, message: err?.message || String(err), version: 'postgres-error' };
    }
    return null;
  }
}
