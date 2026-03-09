# نظام إدارة القوات العسكرية (Army Management System)

هذا المشروع عبارة عن نظام لإدارة القوات العسكرية، مبني باستخدام React للواجهة الأمامية و Express.js للواجهة الخلفية، مع استخدام PostgreSQL كقاعدة بيانات.

## المتطلبات المسبقة

تأكد من تثبيت المتطلبات التالية على نظامك:

-   [Node.js](https://nodejs.org/en/) (الإصدار 20 أو أحدث)
-   [pnpm](https://pnpm.io/) (مدير الحزم)
-   [PostgreSQL](https://www.postgresql.org/) (نظام إدارة قواعد البيانات)

## خطوات التشغيل

اتبع الخطوات التالية لتشغيل التطبيق:

### 1. استنساخ المستودع وتثبيت التبعيات

```bash
git clone https://github.com/MostfaAlsiory/army2.git
cd army2
pnpm install
```

### 2. إعداد قاعدة البيانات

يتطلب التطبيق قاعدة بيانات PostgreSQL. ستحتاج إلى إنشاء مستخدم وقاعدة بيانات، ثم تطبيق المخطط (Schema).

```bash
# ابدأ خدمة PostgreSQL (قد يختلف الأمر حسب نظام التشغيل الخاص بك)
sudo service postgresql start

# قم بتغيير كلمة مرور المستخدم الافتراضي \'postgres\' (إذا لم تكن قد قمت بذلك بالفعل)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'postgres\';"

# أنشئ قاعدة بيانات جديدة
sudo -u postgres psql -c "CREATE DATABASE army_db;"

# قم بتعيين متغير البيئة الخاص برابط قاعدة البيانات
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/army_db

# طبق مخطط قاعدة البيانات باستخدام Drizzle Kit
pnpm db:push
```

### 3. تشغيل التطبيق

بعد إعداد قاعدة البيانات، يمكنك تشغيل التطبيق في وضع التطوير (Development Mode):

```bash
# تأكد من أنك في مجلد المشروع الرئيسي (army2)
cd /path/to/your/army2/project

# قم بتعيين متغير البيئة مرة أخرى إذا لم يكن متاحًا في جلستك الحالية
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/army_db

# تشغيل التطبيق
pnpm dev
```

سيتم تشغيل الواجهة الخلفية على المنفذ `5000`. يمكنك الوصول إلى التطبيق من خلال متصفح الويب الخاص بك على `http://localhost:5000`.

## وضع الإنتاج (Production Mode)

لإنشاء نسخة جاهزة للإنتاج وتشغيلها:

```bash
# بناء المشروع
pnpm build

# تشغيل التطبيق في وضع الإنتاج
pnpm start
```

## الميزات الرئيسية

-   إدارة بيانات الجنود والعسكريين.
-   تتبع الحضور والغياب.
-   تسجيل الانتهاكات والمخالفات.
-   إدارة الأعذار والإجازات.
-   تقارير شاملة عن الحضور والغياب.
-   واجهة مستخدم عربية متقدمة.
