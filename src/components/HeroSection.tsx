import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

const HeroSection = () => {
  return (
    <section className="bg-primary pt-32 pb-20 md:py-32 md:pt-40 text-center">
      <div className="max-w-[800px] mx-auto px-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="font-body text-[11px] tracking-[0.2em] uppercase text-accent mb-6"
        >
          What we do
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="font-display text-3xl md:text-5xl lg:text-[3.5rem] font-black leading-[1.05] text-primary-foreground mb-6"
        >
          Your organisation has{" "}
          <span className="text-accent">vampires.</span>
          <br />
          We bring the coffin.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="font-body-heading text-lg text-primary-foreground/75 max-w-[620px] mx-auto leading-relaxed"
        >
          Dead meetings. Blood-sucking cultures. Communications that say everything while meaning nothing.
          We bury all of it — and build something with an actual pulse in its place.
        </motion.p>
      </div>
    </section>
  );
};

export default HeroSection;
