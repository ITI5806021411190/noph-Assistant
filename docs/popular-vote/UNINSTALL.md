# Popular Vote Uninstall / Rollback

## Quick rollback with Git

ถ้าต้องการถอยทั้งแพตช์ ให้ revert commit ของ Popular Vote หรือ checkout ไฟล์ก่อนหน้า:

```bash
git checkout main -- index.html sw.js vercel.json
```

แล้วลบไฟล์ standalone:

```bash
node scripts/remove-popular-vote-module.mjs
```

## Firebase cleanup

ถ้าใช้งานจริงแล้วต้องล้างข้อมูลทดสอบใน Firestore:

```text
events/back-to-school-2569
```

ลบเฉพาะ event นี้ได้ ไม่เกี่ยวกับ Google Sheet/ฐานข้อมูลหลักของ HAOS

## Disable without deleting

ตั้ง feature flag เป็น false:

```js
window.HAOS_FEATURES.ENABLE_POPULAR_VOTE = false;
```

หรือถอด script `assets/js/modules/popular-vote-module.js` ออกจาก `index.html`
