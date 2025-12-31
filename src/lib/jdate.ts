import dayjs, { type Dayjs } from "dayjs";
import jalaliday from "jalaliday";
import "dayjs/locale/fa";

dayjs.extend(jalaliday);
dayjs.locale("fa");

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

// dayjs در حالت jalali کار می‌کند
export function j(d?: dayjs.ConfigType): Dayjs {
  return dayjs(d).calendar("jalali");
}

// شنبه = 0 ... جمعه = 6 (برای ایران)
export const WEEKDAYS_FA = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

// تبدیل dayjs.day() (یکشنبه=0 ... شنبه=6) به الگوی ایران
export function iranWeekdayIndex(jsDay: number) {
  // شنبه(6) => 0 ، یکشنبه(0) => 1 ... جمعه(5)=>6
  return (jsDay + 1) % 7;
}
