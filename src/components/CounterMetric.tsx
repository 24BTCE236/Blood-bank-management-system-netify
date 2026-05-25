import { useEffect, useState } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useSpring } from 'framer-motion';
import { Sparkles, type LucideIcon } from 'lucide-react';

type CounterMetricProps = {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
};

const CounterMetric = ({ label, value, suffix = '', icon: Icon }: CounterMetricProps) => {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20, mass: 1.1 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useMotionValueEvent(spring, 'change', (latest) => {
    setDisplay(new Intl.NumberFormat('en-US', { maximumFractionDigits: suffix === ' L' ? 1 : 0 }).format(latest));
  });

  return (
    <div className="glass-panel rounded-3xl p-5">
      <div className="mb-6 flex items-center justify-between">
        <span className="soft-chip">
          <Icon className="h-4 w-4 text-blood-400" />
          {label}
        </span>
        <Sparkles className="h-4 w-4 text-blood-300" />
      </div>
      <motion.div className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {display}
        <span className="text-lg text-slate-300">{suffix}</span>
      </motion.div>
      <div className="mt-3 text-sm text-slate-300">Updated in real time from the live local state store.</div>
    </div>
  );
};

export default CounterMetric;
