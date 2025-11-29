#!/bin/bash

# سكريبت نشر LMM Finance إلى Cloudflare Pages الإنتاج

echo "🚀 بدء نشر LMM Finance إلى Cloudflare Pages..."

# الألوان للإخراج الملون
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# دالة لطباعة الرسائل الملونة
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# التحقق من المتطلبات الأساسية
check_requirements() {
    print_status "التحقق من المتطلبات الأساسية..."
    
    # التحقق من Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js غير مثبت. الرجاء تثبيت Node.js 18+"
        exit 1
    fi
    
    # التحقق من npm
    if ! command -v npm &> /dev/null; then
        print_error "npm غير مثبت. الرجاء تثبيت npm"
        exit 1
    fi
    
    # التحقق من wrangler
    if ! command -v wrangler &> /dev/null; then
        print_error "wrangler غير مثبت. قم بالتثبيت: npm install -g wrangler"
        exit 1
    fi
    
    print_success "جميع المتطلبات الأساسية متوفرة"
}

# تثبيت الحزم
install_dependencies() {
    print_status "تثبيت الحزم..."
    
    if npm install; then
        print_success "تم تثبيت الحزم بنجاح"
    else
        print_error "فشل في تثبيت الحزم"
        exit 1
    fi
}

# تشغيل الاختبارات
run_tests() {
    print_status "تشغيل الاختبارات..."
    
    if npm run test:run; then
        print_success "جميع الاختبارات ناجحة ✅"
    else
        print_error "فشلت بعض الاختبارات"
        print_warning "يمكنك تخطي الاختبارات باستخدام --skip-tests"
        exit 1
    fi
}

# بناء المشروع
build_project() {
    print_status "بناء المشروع..."
    
    if npm run build:prod; then
        print_success "تم بناء المشروع بنجاح"
    else
        print_error "فشل في بناء المشروع"
        exit 1
    fi
}

# التحقق من وجود قاعدة البيانات
setup_database() {
    print_status "إعداد قاعدة البيانات..."
    
    # التحقق من وجود قاعدة البيانات
    if wrangler d1 list | grep -q "lmm-db"; then
        print_success "قاعدة البيانات lmm-db موجودة"
    else
        print_warning "قاعدة البيانات lmm-db غير موجودة، إنشاء..."
        if wrangler d1 create lmm-db; then
            print_success "تم إنشاء قاعدة البيانات"
        else
            print_error "فشل في إنشاء قاعدة البيانات"
            exit 1
        fi
    fi
    
    # تطبيق المخطط
    print_status "تطبيق مخطط قاعدة البيانات..."
    if wrangler d1 execute lmm-db --file=./database/migrations/0001_initial_schema.sql; then
        print_success "تم تطبيق مخطط قاعدة البيانات"
    else
        print_error "فشل في تطبيق مخطط قاعدة البيانات"
        exit 1
    fi
    
    # إضافة البيانات التجريبية (اختياري)
    print_status "إضافة البيانات التجريبية..."
    if wrangler d1 execute lmm-db --file=./database/seed.sql; then
        print_success "تم إضافة البيانات التجريبية"
    else
        print_warning "فشل في إضافة البيانات التجريبية (قد تكون موجودة بالفعل)"
    fi
}

# نشر التطبيق
deploy_app() {
    print_status "نشر التطبيق إلى Cloudflare Pages..."
    
    if wrangler pages deploy dist; then
        print_success "تم نشر التطبيق بنجاح! 🎉"
        
        # الحصول على معلومات النشر
        print_status "معلومات النشر:"
        wrangler pages project list | grep lmm-finance
    else
        print_error "فشل في نشر التطبيق"
        exit 1
    fi
}

# إعداد المتغيرات البيئية
setup_environment() {
    print_status "إعداد المتغيرات البيئية..."
    
    # إعداد secrets (إذا لم تكن مضبوطة)
    local secrets=("JWT_SECRET" "EMAIL_API_KEY" "ADMIN_PASSWORD")
    
    for secret in "${secrets[@]}"; do
        if ! wrangler secret list | grep -q "$secret"; then
            print_warning "الـ secret $secret غير مضبوط"
            print_status "لإضافة الـ secret: wrangler secret put $secret"
        fi
    done
}

# عرض ملخص النشر
show_summary() {
    print_success "✅ تم نشر LMM Finance بنجاح!"
    print_status "ملخص النشر:"
    echo "  • التطبيق: LMM Finance v1.0.0"
    echo "  • النظام الأساسي: Cloudflare Pages"
    echo "  • قاعدة البيانات: Cloudflare D1"
    echo "  • التخزين المؤقت: Cloudflare KV"
    echo "  • الميزات: أمان متقدم، إدارة رواتب، RTL عربي"
    echo ""
    print_status "الروابط المهمة:"
    echo "  • لوحة التحكم: https://your-domain.pages.dev"
    echo "  • API الوثائق: https://your-domain.pages.dev/api/docs"
    echo "  • حالة النظام: https://your-domain.pages.dev/api/health"
}

# معالجة المعاملات
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            echo "استخدام: $0 [OPTIONS]"
            echo ""
            echo "الخيارات:"
            echo "  --skip-tests    تخطي تشغيل الاختبارات"
            echo "  --help          عرض هذه الرسالة"
            exit 0
            ;;
        *)
            print_error "خيار غير معروف: $1"
            exit 1
            ;;
    esac
done

# سير العمل الرئيسي
main() {
    print_status "بدء عملية نشر LMM Finance..."
    
    check_requirements
    install_dependencies
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "تم تخطي الاختبارات"
    fi
    
    build_project
    setup_database
    setup_environment
    deploy_app
    show_summary
    
    print_success "اكتملت عملية النشر! 🚀"
}

# تشغيل السكريبت
main "$@"