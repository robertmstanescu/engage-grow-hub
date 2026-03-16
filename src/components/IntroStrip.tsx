import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

const IntroStrip = () =>
<div className="py-8 px-6 text-center bg-[#e4c44e]">
    <motion.p
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, ease }}
    className="font-body-heading text-base font-medium max-w-[700px] mx-auto text-[#1a1e23]">
    
      We work across two disciplines: <strong>Internal Communications</strong> and{" "}
      <strong>Employee Experience</strong>. Every engagement starts with the same question —
      where is the life being drained? — and ends with something that actually works.
    </motion.p>
  </div>;


export default IntroStrip;