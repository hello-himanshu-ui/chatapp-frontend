import toast from "react-hot-toast";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, MessageCircle } from "lucide-react";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  // UI-only state additions — do not affect existing logic
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);

      localStorage.setItem("token", res.data.token);

    toast.success("Login successful 🎉");

      navigate("/chat");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Animation Added - Stagger Container Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15,
      },
    },
  };

  // Animation Added - Individual Item Entrance Variant
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] },
    },
  };

  return (
    // Modified Animation - Smooth Page Entrance
    <motion.div
      initial={{ opacity: 0, y: 25 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -25 }}
transition={{
  duration: 0.45,
  ease: "easeInOut",}}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0b0f19] px-4 py-10"
    >
      {/* Animation Added - Floating animated background gradient blobs */}
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, -25, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-violet-600/25 blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -30, 0],
          y: [0, 30, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-fuchsia-600/20 blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.1, 0.18, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl"
      />

      {/* Modified Animation - Floating Glass Card Entrance & Ambient Floating */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl shadow-black/40 px-8 py-10 sm:px-10"
        >
          {/* Modified Animation - Logo Header & Stagger Container */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Modified Animation - Smooth Logo Entrance */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center mb-8"
            >
              <motion.div
                whileHover={{ scale: 1.08, rotate: 4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4 cursor-pointer"
              >
                <MessageCircle size={22} className="text-white" />
              </motion.div>
              <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-sm text-slate-500 mt-1.5 text-center">
                Sign in to continue your conversations
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Animation Added - Email Field Hover & Stagger Item */}
              <motion.div variants={itemVariants}>
                <motion.label
                  whileHover={{ scale: 1.01, borderColor: "rgba(255, 255, 255, 0.2)" }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 transition-all duration-200 focus-within:bg-white/10 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/40"
                >
                  <Mail size={18} className="text-slate-500 shrink-0" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="grow bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500"
                  />
                </motion.label>
              </motion.div>

              {/* Animation Added - Password Field Hover & Stagger Item */}
              <motion.div variants={itemVariants}>
                <motion.label
                  whileHover={{ scale: 1.01, borderColor: "rgba(255, 255, 255, 0.2)" }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 transition-all duration-200 focus-within:bg-white/10 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/40"
                >
                  <Lock size={18} className="text-slate-500 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="grow bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-300 transition-colors duration-150"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </motion.button>
                </motion.label>
              </motion.div>

              {/* Modified Animation - Submit Button Interactive Hover/Tap */}
              <motion.div variants={itemVariants}>
                <motion.button
                  whileHover={{
                    scale: loading ? 1 : 1.02,
                    boxShadow: "0px 10px 25px -5px rgba(139, 92, 246, 0.45)",
                  }}
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium text-sm py-3 shadow-lg shadow-violet-500/25 transition-shadow duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Login"
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* Animation Added - Footer Stagger & Animated Link */}
            <motion.p
              variants={itemVariants}
              className="text-center text-sm text-slate-500 mt-7"
            >
              Don't have an account?{" "}
              <motion.span
                className="inline-block"
                whileHover={{ scale: 1.05, x: 2 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Link
                  to="/signup"
                  className="text-violet-400 hover:text-violet-300 font-medium transition-colors duration-150"
                >
                  Sign up
                </Link>
              </motion.span>
            </motion.p>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default Login;