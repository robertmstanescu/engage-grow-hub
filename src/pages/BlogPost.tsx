import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ease = [0.16, 1, 0.3, 1] as const;

interface BlogArticle {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  category: string;
  content: string[];
}

const articles: Record<string, BlogArticle> = {
  "why-internal-comms-fails": {
    slug: "why-internal-comms-fails",
    title: "Why Your Internal Comms Strategy Is Failing (And What to Do About It)",
    date: "2026-03-10",
    readTime: "6 min read",
    category: "Internal Communications",
    content: [
      "Most internal communications strategies are built on assumptions. They assume employees read emails. They assume town halls inspire. They assume the intranet is alive.",
      "Here's the uncomfortable truth: most internal comms is noise dressed up as signal. It fills channels without filling minds. It broadcasts without connecting. And the people it's meant to reach? They tuned out months ago.",
      "The problem isn't that your people don't care. It's that your communications haven't given them a reason to. When every message sounds the same — corporate, sanitised, devoid of personality — employees learn to filter it out. It becomes wallpaper.",
      "So what does good internal comms actually look like? It starts with honesty. Not the performative kind that opens with 'transparency is one of our values.' Real honesty. The kind that admits when things are uncertain, acknowledges mistakes, and treats employees like adults.",
      "It continues with architecture. Not every message belongs in every channel. A restructure announcement doesn't belong in the same Slack channel as the Friday quiz. A CEO update shouldn't compete with the lunch menu on the intranet homepage.",
      "And it ends with measurement. Not vanity metrics like email open rates — but genuine indicators of understanding, trust, and alignment. Do people know what the company is trying to achieve this quarter? Can they explain the strategy to a new joiner? That's the real test.",
      "If your internal comms strategy feels like it's failing, it probably is. But the fix isn't more content. It's better architecture, braver messaging, and a genuine commitment to treating employees as your most important audience. Because they are.",
    ],
  },
  "onboarding-first-90-days": {
    slug: "onboarding-first-90-days",
    title: "The First 90 Days: Why Onboarding Is Your Most Expensive Blind Spot",
    date: "2026-03-03",
    readTime: "8 min read",
    category: "Employee Experience",
    content: [
      "Here's a number that should keep every People leader awake at night: 20% of employee turnover happens within the first 45 days. Not the first year. The first 45 days.",
      "And yet, most onboarding programmes are still built around compliance. Sign this. Watch that. Here's your laptop. Good luck.",
      "The cost of getting this wrong is staggering. Replacing an employee costs between 50% and 200% of their annual salary, depending on the role. For a company hiring 50 people a year, poor onboarding could be burning through hundreds of thousands in hidden costs.",
      "Great onboarding isn't about the first day. It's about the first 90. It's a designed journey with clear milestones, emotional peaks, and intentional human connection. Day 1 should make someone feel they made the right choice. Week 1 should make them feel they belong. Month 1 should make them feel competent. Month 3 should make them feel invested.",
      "The best onboarding programmes we've designed share three things in common: they're personal (not one-size-fits-all), they're social (built around relationships, not just information), and they're measured (with clear checkpoints and feedback loops).",
      "If your onboarding experience ends after the first week, you don't have an onboarding experience. You have an orientation. And orientation doesn't retain talent. Experience does.",
      "The first 90 days are your single greatest opportunity to turn a new hire into a long-term contributor. Don't waste them on a checklist.",
    ],
  },
  "engagement-surveys-done-right": {
    slug: "engagement-surveys-done-right",
    title: "Stop Running Engagement Surveys You Never Act On",
    date: "2026-02-24",
    readTime: "5 min read",
    category: "Employee Experience",
    content: [
      "Every year, millions of employees fill in engagement surveys. They answer questions about their manager, their workload, their sense of belonging. They write thoughtful comments in the free-text boxes. And then… nothing happens.",
      "The survey results get presented to the leadership team. There's a moment of concern. Someone says 'we need to do better.' And then the slides get filed, the scores get benchmarked, and the cycle repeats.",
      "This is survey theatre. And employees see right through it.",
      "The problem isn't the survey itself. Well-designed surveys are powerful diagnostic tools. The problem is the gap between data and action. Most organisations are good at collecting engagement data. Very few are good at doing something meaningful with it.",
      "Here's what we recommend: before you even send a survey, decide what you're willing to change. If the answer is 'nothing,' don't send it. Every survey creates an implicit promise: we're listening, and we're going to act. Breaking that promise is worse than never asking.",
      "When you do act, start small but start visibly. Pick three things from the results that you can change within 30 days. Communicate what you heard, what you're doing, and when people will see the change. Then follow through.",
      "Engagement isn't a number. It's a relationship. And like any relationship, it's built on trust. Trust comes from listening and acting. If you're only doing one of those, you're not building engagement. You're eroding it.",
    ],
  },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articles[slug] : null;

  if (!article) {
    return (
      <div className="min-h-screen mt-[20px]">
        <Navbar />
        <div className="pt-32 pb-20 text-center px-6">
          <h1 className="font-display text-2xl font-bold text-secondary mb-4">Article not found</h1>
          <Link to="/blog" className="font-body text-sm text-primary underline">← Back to all articles</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-[20px]">
      <Navbar />
      <article>
        <header
          className="pt-32 pb-12 px-6"
          style={{ backgroundColor: "hsl(var(--primary))" }}>
          <div className="max-w-[700px] mx-auto">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-[0.12em] mb-6 transition-opacity hover:opacity-70"
              style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
              <ArrowLeft size={14} />
              All articles
            </Link>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="font-body text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: "hsl(var(--accent) / 0.2)",
                    color: "hsl(var(--accent))"
                  }}>
                  {article.category}
                </span>
                <span className="font-body text-xs" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>
                  {formatDate(article.date)} · {article.readTime}
                </span>
              </div>
              <h1
                className="font-display text-2xl md:text-3xl lg:text-4xl font-black leading-tight"
                style={{ color: "hsl(var(--primary-foreground))" }}>
                {article.title}
              </h1>
            </motion.div>
          </div>
        </header>

        <div className="py-12 px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="max-w-[700px] mx-auto space-y-6">
            {article.content.map((paragraph, i) => (
              <p key={i} className="font-body text-base text-foreground/80 leading-[1.8]">
                {paragraph}
              </p>
            ))}
          </motion.div>

          <div className="max-w-[700px] mx-auto mt-12 pt-8" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 font-body text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: "hsl(var(--primary))" }}>
              <ArrowLeft size={16} />
              Back to all articles
            </Link>
          </div>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
