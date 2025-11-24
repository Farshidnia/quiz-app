import { motion } from "framer-motion";
import logo from "/logo_copynet.png";

export default function About() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-brand-50 to-white"
    >
      <div className="bg-white/90 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-200 backdrop-blur-md">

        {/* لوگو */}
        <img
          src={logo}
          alt="کافی نت جواد"
          className="w-32 h-32 mx-auto mb-4 rounded-xl shadow"
        />

        {/* عنوان */}
        <h2
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "MRT_Khodkar" }}
        >
          کافی نت و تایپ تکثیر جواد
        </h2>

        {/* شماره تماس */}
        <div className="mt-4 text-xl text-gray-700">
          <strong>شماره تماس: </strong>  
          <span dir="ltr">0999-926-0056</span>
        </div>




        <div className="mt-3 text-xl text-gray-700 leading-relaxed">
          خدمات اینترنتی و انجام تمامی امور ثبت نامی
          <br />
           چاپ و کپی با کیفیت بالا (رنگی و سیاه سفید)
        </div>







        {/* آدرس */}
        <div className="mt-3 text-xl text-gray-700 leading-relaxed">
          <strong>آدرس:</strong>
          <br />
          خیابان شهید مطهری (بازار مشهد)  
          بین چهارراه دوم و سوم، جنب گاراژ رستگار
        </div>

        {/* نقشه */}
        {/* <div className="mt-6">
          <img
            src="/map-placeholder.jpg"
            alt="نقشه"
            className="w-full rounded-xl shadow-md"
          />
          <div className="text-xs text-gray-500 mt-1">
            * اگر خواستی نقشه واقعی بده من جاشو می‌ذارم
          </div>
        </div> */}

      </div>
    </motion.div>
  );
}
