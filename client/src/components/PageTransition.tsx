/**
 * PageTransition — simple passthrough wrapper.
 *
 * The previous AnimatePresence + motion.div keyed on location.pathname
 * wrapped <Routes>, which broke route matching (React Router unmounts
 * all routes on every nav). Per-screen animations (already present on
 * every screen via framer-motion initial/animate) handle transitions.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
