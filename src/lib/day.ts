import dayjs from "dayjs";
import jalaliday from "jalaliday";
import "dayjs/locale/fa";

dayjs.extend(jalaliday);

// پیش‌فرض: میلادی بمونه، هرجا لازم داریم calendar('jalali') می‌زنیم
// اگر خواستی کل پروژه شمسی بشه:
// dayjs.calendar("jalali");

export default dayjs;
