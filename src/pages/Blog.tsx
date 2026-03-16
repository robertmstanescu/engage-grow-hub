import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ease = [0.16, 1, 0.3, 1] as const;

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
}

const posts: BlogPost[] = [
  {
    slug: "why-internal-comms-fails",
    title: "Why Your Internal Comms Strategy Is Failing (And What to Do About It)",
    excerpt: "Most internal communications strategies are built on assumptions. They assume employees read emails. They assume town halls inspire. They assume the intranet is alive. Here's why those assumptions are costing you.",
    date: "2026-03-10",
    readTime: "6 min read",
    category: "Internal Communications",
  },
  {
    slug: "onboarding-first-90-days",
    title: "The First 90 Days: Why Onboarding Is Your Most Expensive Blind Spot",
    excerpt: "Bad onboarding doesn't just frustrate new hires — it costs you between 50% and 200% of their annual salary when they leave. Here's how to design an onboarding experience that actually retains talent.",
    date: "2026-03-03",
    readTime: "8 min read",
    category: "Employee Experience",
  },
  {
    slug: "engagement-surveys-done-right",
    title: "Stop Running Engagement Surveys You Never Act On",
    excerpt: "The survey isn't the problem. The problem is what happens after. Most organisations collect engagement data, look at a number, and move on. Here's how to turn survey results into real change.",
    date: "2026-02-24",
    readTime: "5 min read",
    category: "Employee Experience",
  },
];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const Blog = () => {
  return (
    <div className="min-h-screen mt-[20px]">
      <Navbar />
      <section
        className="pt-32 pb-12 text-center"
        style={{ backgroundColor: "hsl(var(--primary))" }}>
        <div className="max-w-[800px] mx-auto px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="font-display text-3xl md:text-4xl font-black leading-tight mb-4"
            style={{ color: "hsl(var(--primary-foreground))" }}>
            Insights & Articles
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="font-body-heading text-base max-w-[600px] mx-auto"
            style={{ color: "hsl(var(--primary-foreground) / 0.75)" }}>
            Sharp thinking on internal communications, employee experience, and the culture vampires lurking in your organisation.
          </motion.p>
        </div>
      </section>

      <section className="py-16 px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
        <div className="max-w-[800px] mx-auto">
          <div className="space-y-8">
            {posts.map((post, i) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="block rounded-lg p-6 md:p-8 transition-all duration-200 hover:shadow-lg group"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.5)"
                  }}>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                    <span
                      className="font-body text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 md:px-2.5 md:py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: "hsl(var(--accent) / 0.15)",
                        color: "hsl(var(--accent-foreground))"
                      }}>
                      {post.category}
                    </span>
                    <span className="font-body text-xs text-muted-foreground">{formatDate(post.date)}</span>
                    <span className="font-body text-xs text-muted-foreground">· {post.readTime}</span>
                  </div>
                  <h2
                    className="font-display text-lg md:text-xl font-bold leading-tight mb-2 group-hover:opacity-80 transition-opacity"
                    style={{ color: "hsl(var(--secondary))" }}>
                    {post.title}
                  </h2>
                  <p className="font-body text-sm text-foreground/70 leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Blog;
