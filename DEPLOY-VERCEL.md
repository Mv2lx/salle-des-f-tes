# نشر Hotel EL FARES على Vercel + Turso

## 1. تثبيت الحزم الجديدة محلياً
```bash
npm install
```

## 2. إنشاء حساب وقاعدة بيانات Turso
```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup        # أو turso auth login إذا عندك حساب

turso db create hotel-elfares
turso db show hotel-elfares --url
turso db tokens create hotel-elfares
```
احتفظ بالرابط (URL) والتوكن (Token).

## 3. تصدير المخطط (Schema) إلى Turso
في `.env` المحلي أضف مؤقتاً:
```
TURSO_DATABASE_URL=<الرابط>
TURSO_AUTH_TOKEN=<التوكن>
```
ثم:
```bash
npm run db:push
```

> إذا عندك بيانات حقيقية بـ `data/hotel.db` تريد نقلها بدل البدء بقاعدة فارغة، أخبرني وأجهز سكربت النقل.

## 4. رفع المشروع إلى GitHub
تأكد أن `.env`, `node_modules`, `data/` مستثناة عبر `.gitignore` (موجودة مسبقاً في المشروع) قبل الرفع.

## 5. الاستيراد إلى Vercel
1. من [vercel.com](https://vercel.com) → **Add New → Project** → اختر المستودع من GitHub.
2. Vercel يكتشف Next.js تلقائياً، لا حاجة لأي ملف إعداد إضافي.
3. قبل الضغط على Deploy، افتح **Environment Variables** وأضف:

| المتغير | القيمة |
|---|---|
| `TURSO_DATABASE_URL` | نفس رابط الخطوة 2 |
| `TURSO_AUTH_TOKEN` | نفس توكن الخطوة 2 |
| `SESSION_SECRET` | نفس القيمة العشوائية الموجودة في `.env` المحلي (أو ولّد قيمة جديدة) |
| `SEED_DEFAULT_PASSWORD` | كلمة مرور قوية من اختيارك |

**لا تضف** `DATABASE_PATH` — هذا فقط للتطوير المحلي.

4. اضغط **Deploy**.

## 6. ربط الدومين
من **Project Settings → Domains** أضف الدومين الخاص بك. Vercel يعطيك سجلات DNS (عادة A record أو CNAME) تضيفها عند مزود الدومين.

## 7. أول تشغيل بعد النشر
أرسل طلب POST إلى `https://<موقعك>/api/seed` مرة واحدة لإنشاء الحسابات الافتراضية (admin/reception/comptable)، ثم غيّر كلمات المرور فوراً من داخل التطبيق.

## تذكير أمني قبل الإطلاق الفعلي
- تأكد أن `SESSION_SECRET` في Vercel قيمة عشوائية حقيقية، مختلفة عن أي قيمة تجريبية.
- بعد أول seed، فكّر بحماية `/api/seed` أو حذفه.
- غيّر كلمات مرور الحسابات الافتراضية فوراً بعد أول دخول.
