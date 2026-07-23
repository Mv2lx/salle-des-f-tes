# نشر Hotel EL FARES على Netlify + Turso

## 1. تثبيت الحزم الجديدة محلياً
```bash
npm install
```
(هذا سيثبّت `@libsql/client` بدل `better-sqlite3`، ويشتغل محلياً بنفس ملف `./data/hotel.db` بدون أي تغيير في تجربة التطوير.)

## 2. إنشاء حساب وقاعدة بيانات Turso
```bash
# تثبيت الأداة (مرة واحدة فقط)
curl -sSfL https://get.tur.so/install.sh | bash

# تسجيل الدخول (يفتح المتصفح)
turso auth login

# إنشاء قاعدة البيانات
turso db create hotel-elfares

# الحصول على رابط الاتصال
turso db show hotel-elfares --url

# إنشاء توكن مصادقة
turso db tokens create hotel-elfares
```
احتفظ بالقيمتين (URL + Token) — رح تحتاجهم في الخطوة القادمة وفي Netlify.

## 3. تصدير المخطط (Schema) إلى Turso
في ملف `.env` المحلي، أضف مؤقتاً:
```
TURSO_DATABASE_URL=<الرابط من الخطوة السابقة>
TURSO_AUTH_TOKEN=<التوكن من الخطوة السابقة>
```
ثم شغّل:
```bash
npm run db:push
```
هذا سينشئ كل الجداول في قاعدة Turso مباشرة من `schema.ts`.

> ملاحظة: إذا كان عندك بيانات حقيقية في `data/hotel.db` تريد نقلها (وليس البدء بقاعدة فارغة)، أخبرني وأجهز لك سكربت نقل البيانات.

## 4. ربط المستودع بـ Netlify
1. ارفع المشروع إلى GitHub (تأكد أن `.env` و `node_modules` و `data/` داخل `.gitignore`، وليست مرفوعة).
2. من لوحة Netlify: **Add new site → Import an existing project** واختر المستودع.
3. Netlify سيكتشف `netlify.toml` تلقائياً (أضفناه في المشروع) ويستخدم `@netlify/plugin-nextjs`.

## 5. متغيرات البيئة في Netlify
في **Site settings → Environment variables** أضف:
| المتغير | القيمة |
|---|---|
| `TURSO_DATABASE_URL` | نفس الرابط من الخطوة 2 |
| `TURSO_AUTH_TOKEN` | نفس التوكن من الخطوة 2 |
| `SESSION_SECRET` | القيمة الجديدة الموجودة في `.env` المحلي (أو ولّد واحدة أخرى) |
| `SEED_DEFAULT_PASSWORD` | كلمة مرور قوية من اختيارك لحسابات البداية |

**لا تضع** `DATABASE_PATH` في Netlify — هذا فقط للتطوير المحلي.

## 6. ربط الدومين
من **Domain settings** في Netlify، أضف الدومين الخاص بك واتبع تعليمات تحديث الـ DNS (عادة CNAME أو Nameservers حسب مزود الدومين).

## 7. أول تشغيل بعد النشر
افتح `https://<موقعك>/api/seed` مرة واحدة (طلب POST) لإنشاء الحسابات الافتراضية (admin/reception/comptable)، ثم غيّر كلمات المرور من داخل التطبيق فوراً.

## تذكير أمني قبل الإطلاق الفعلي
- تأكد أن `SESSION_SECRET` في Netlify مختلف عن أي قيمة تجريبية.
- بعد أول seed، فكّر بحماية `/api/seed` أو حذف المسار كلياً.
- غيّر كلمات مرور الحسابات الافتراضية فوراً بعد أول دخول.
