'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Icons as inline SVGs for the landing page
const MicIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ZapIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

const FileTextIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const WindowsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
  </svg>
);

const LinuxIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.504 0c-.155 0-.311.004-.466.013-3.476.15-6.26 2.962-6.26 6.506 0 .312.016.624.048.935-.012.168-.019.337-.019.508 0 .154.006.307.017.459-.026.186-.04.374-.04.562 0 1.12.396 2.144 1.054 2.944a5.953 5.953 0 0 0-.393 2.136c0 1.673.69 3.183 1.8 4.268.039.038.078.075.118.112.57.533 1.05 1.16 1.423 1.858.478.895.748 1.904.748 2.975v.185H10c0-1.134-.292-2.196-.8-3.12a9.035 9.035 0 0 0-.99-1.44 5.96 5.96 0 0 1-1.558-4.013c0-1.586.62-3.025 1.63-4.096a5.964 5.964 0 0 1-.608-2.607c0-2.965 2.179-5.422 5.029-5.876a6.018 6.018 0 0 1 .797-.052c.269 0 .534.018.797.052 2.85.454 5.029 2.911 5.029 5.876a5.964 5.964 0 0 1-.608 2.607 5.964 5.964 0 0 1 1.072 7.549 9.035 9.035 0 0 0-.99 1.44c-.508.924-.8 1.986-.8 3.12h1.466v-.185c0-1.071.27-2.08.748-2.975.373-.698.853-1.325 1.423-1.858.04-.037.079-.074.118-.112a5.964 5.964 0 0 0 1.8-4.268c0-.759-.142-1.486-.393-2.136.658-.8 1.054-1.824 1.054-2.944 0-.188-.014-.376-.04-.562.011-.152.017-.305.017-.459 0-.171-.007-.34-.019-.508.032-.311.048-.623.048-.935 0-3.544-2.784-6.356-6.26-6.506A6.998 6.998 0 0 0 12.504 0z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" x2="12" y1="2" y2="15" />
  </svg>
);

const UserPenIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.5 15H7a4 4 0 0 0-4 4v2" />
    <path d="M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
    <circle cx="10" cy="7" r="4" />
  </svg>
);

const WebhookIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
    <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
    <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
  </svg>
);

const NotionIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.016c-.42-.326-.98-.7-2.055-.607L3.01 2.625c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.64 1.472l13.402-1c1.635-.14 2.055-.047 3.082.7l4.25 2.993c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.966c0-.84.374-1.54 1.355-1.494z" />
  </svg>
);

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const SunIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const MonitorIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

type OS = 'mac' | 'windows' | 'linux' | 'unknown';

function detectOS(): OS {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform =
    (
      window.navigator as Navigator & { userAgentData?: { platform: string } }
    ).userAgentData?.platform?.toLowerCase() ||
    window.navigator.platform?.toLowerCase() ||
    '';

  if (platform.includes('mac') || userAgent.includes('mac')) return 'mac';
  if (platform.includes('win') || userAgent.includes('win')) return 'windows';
  if (platform.includes('linux') || userAgent.includes('linux')) return 'linux';

  return 'unknown';
}

const DOWNLOAD_LINKS = {
  mac: {
    url: '#download-mac',
    label: 'Download for macOS',
    icon: AppleIcon,
    version: 'macOS 12+',
    file: 'Everlast AI Recorder-1.0.0-arm64.dmg',
  },
  windows: {
    url: '#download-windows',
    label: 'Download for Windows',
    icon: WindowsIcon,
    version: 'Windows 10+',
    file: 'Everlast AI Recorder-1.0.0-x64.msi',
  },
  linux: {
    url: '#download-linux',
    label: 'Download for Linux',
    icon: LinuxIcon,
    version: 'Ubuntu 20.04+',
    file: 'Everlast AI Recorder-1.0.0-amd64.AppImage',
  },
};

const FEATURES = [
  {
    icon: MicIcon,
    title: 'Real-Time Transcription',
    description:
      'Instantly convert speech to text with industry-leading accuracy. Support for 30+ languages with automatic detection.',
  },
  {
    icon: UsersIcon,
    title: 'Speaker Diarization',
    description:
      'Automatically identify and label different speakers in your recordings. Perfect for meetings, interviews, and podcasts.',
  },
  {
    icon: UserPenIcon,
    title: 'Custom Speaker Names',
    description:
      'Rename speakers from "Speaker 1" to real names like "John" or "Sarah". Names persist across all exports and views.',
  },
  {
    icon: SparklesIcon,
    title: 'AI Actions',
    description:
      'One-click AI actions: generate summaries, extract tasks, uncover key insights, translate, or clean up formatting.',
  },
  {
    icon: GlobeIcon,
    title: 'Multi-Language Translation',
    description:
      'Translate your transcripts to 15+ languages instantly using AI. Break down language barriers effortlessly.',
  },
  {
    icon: ShareIcon,
    title: 'Flexible Export Options',
    description:
      'Export to PDF, Markdown, or email. Send to Notion with one click. Connect webhooks for Zapier, n8n, or Make.',
  },
  {
    icon: WebhookIcon,
    title: 'Automation Ready',
    description:
      'Connect to your favorite tools via webhooks. Automatically send transcripts to Zapier, n8n, Make, or any custom endpoint.',
  },
  {
    icon: ShieldIcon,
    title: 'Privacy-First Design',
    description:
      'Your data stays on your device with encrypted local storage. Optional local LLM support via Ollama.',
  },
  {
    icon: ZapIcon,
    title: 'Global Hotkey',
    description:
      'Start recording instantly from anywhere with a customizable global keyboard shortcut. Never miss a moment.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Press Record',
    description: 'Hit the global hotkey or click to start capturing audio instantly.',
  },
  {
    number: '02',
    title: 'Speak Naturally',
    description: 'Watch your words appear in real-time with speaker identification.',
  },
  {
    number: '03',
    title: 'Enrich with AI',
    description: 'Generate summaries, extract tasks, translate, or format with one click.',
  },
  {
    number: '04',
    title: 'Export Anywhere',
    description: 'Send to Notion, export as PDF, or trigger webhooks to your favorite tools.',
  },
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Unlimited local recordings',
      'Basic transcription via Whisper',
      'Local LLM enrichment (Ollama)',
      'Encrypted local storage',
      'Export to text/markdown/PDF',
      'Custom speaker names',
    ],
    cta: 'Download Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For power users and professionals',
    features: [
      'Everything in Free',
      'Deepgram real-time transcription',
      'OpenAI & Claude AI actions',
      'Speaker diarization',
      'Multi-language translation',
      'Notion & webhook integrations',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$29',
    period: '/user/month',
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Shared session library',
      'Admin dashboard',
      'SSO integration',
      'Custom webhook templates',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function LandingPage() {
  const [detectedOS, setDetectedOS] = useState<OS>('unknown');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    setDetectedOS(detectOS());

    // Landing page should follow system theme by default
    setTheme('system');

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setTheme]);

  const cycleTheme = () => {
    // Cycle: light → dark → system → light...
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const primaryDownload = DOWNLOAD_LINKS[detectedOS === 'unknown' ? 'mac' : detectedOS];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav
        className={cn(
          'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
          isScrolled ? 'border-b bg-background/80 backdrop-blur-lg' : 'bg-transparent'
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
                <MicIcon className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold">Everlast AI Recorder</span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <a
                href="#features"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                How it Works
              </a>
              <a
                href="#integrations"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Integrations
              </a>
              <a
                href="#pricing"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Pricing
              </a>
              <a
                href="#download"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Download
              </a>
            </div>
            <div className="flex items-center gap-3">
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleTheme}
                  className="h-9 w-9"
                  aria-label={`Theme: ${theme}. Click to change.`}
                  title={`Current: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`}
                >
                  {theme === 'system' ? (
                    <MonitorIcon className="h-4 w-4" />
                  ) : resolvedTheme === 'dark' ? (
                    <SunIcon className="h-4 w-4" />
                  ) : (
                    <MoonIcon className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <a href="#download">Download</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pb-20 pt-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-1/4 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 opacity-20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <SparklesIcon className="h-4 w-4" />
              <span>Powered by Advanced AI</span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Transform Your Voice Into
              <span className="block bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                Enriched Content
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground">
              The desktop app that transcribes your speech in real-time, identifies speakers,
              transforms recordings into summaries and insights, and exports everywhere you need.
            </p>

            {/* CTA Buttons */}
            <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="h-14 gap-2 px-8 text-lg" asChild>
                <a href="#download">
                  <DownloadIcon className="h-5 w-5" />
                  Download Free
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-14 gap-2 px-8 text-lg">
                <PlayIcon className="h-4 w-4" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col items-center justify-center gap-6 text-sm text-muted-foreground sm:flex-row">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/40 to-primary/20"
                    />
                  ))}
                </div>
                <span>10,000+ users</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="h-4 w-4 fill-current text-yellow-500" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* App Screenshot */}
          <div className="relative mt-20">
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="relative mx-auto max-w-5xl">
              <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-center text-xs text-muted-foreground">
                    Everlast AI Recorder
                  </div>
                </div>
                {/* App preview */}
                <div className="aspect-[16/10] bg-gradient-to-br from-card to-muted/30 p-8">
                  <div className="flex h-full items-center justify-center rounded-lg border bg-background/50">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                        <MicIcon className="h-10 w-10 text-primary" />
                      </div>
                      <p className="text-lg font-medium">Ready to capture your voice</p>
                      <p className="text-sm text-muted-foreground">
                        Press ⌘+Shift+R to start recording
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Everything you need to capture and enhance your voice
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features that make transcription and content creation effortless.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Simple. Fast. Powerful.</h2>
            <p className="text-lg text-muted-foreground">
              Get from voice to enriched content in three easy steps.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step, index) => (
              <div key={step.number} className="relative">
                {index < STEPS.length - 1 && (
                  <div className="absolute left-full top-12 hidden h-px w-full -translate-x-1/2 bg-gradient-to-r from-primary/50 to-transparent lg:block" />
                )}
                <div className="text-center">
                  <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-2xl font-bold text-primary">{step.number}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Connect to Your Favorite Tools</h2>
            <p className="text-lg text-muted-foreground">
              Export transcripts anywhere. Automate your workflow with powerful integrations.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Notion Integration */}
            <div className="rounded-2xl border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#000000]">
                <NotionIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Notion</h3>
              <p className="text-sm text-muted-foreground">
                One-click OAuth connection. Export directly to your workspace pages.
              </p>
            </div>

            {/* Zapier Integration */}
            <div className="rounded-2xl border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF4A00]">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 13.5h-3v3a1.5 1.5 0 01-3 0v-3h-3a1.5 1.5 0 010-3h3v-3a1.5 1.5 0 013 0v3h3a1.5 1.5 0 010 3z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Zapier</h3>
              <p className="text-sm text-muted-foreground">
                Connect via webhooks to 5,000+ apps. Automate your transcript workflow.
              </p>
            </div>

            {/* n8n Integration */}
            <div className="rounded-2xl border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EA4B71]">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">n8n</h3>
              <p className="text-sm text-muted-foreground">
                Self-hosted automation. Full control over your data and workflows.
              </p>
            </div>

            {/* PDF Export */}
            <div className="rounded-2xl border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E44332]">
                <FileTextIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">PDF Export</h3>
              <p className="text-sm text-muted-foreground">
                Beautiful formatted documents with speaker labels and timestamps.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="mb-4 text-muted-foreground">
              Need a custom integration? Use our webhook API to send transcripts anywhere.
            </p>
            <Button variant="outline" className="gap-2" asChild>
              <a href="#download">
                <WebhookIcon className="h-4 w-4" />
                View API Docs
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground">
              Start free and upgrade as you grow. No hidden fees.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'relative rounded-2xl border bg-card p-8 transition-all duration-300',
                  plan.highlighted
                    ? 'z-10 scale-105 border-primary shadow-xl'
                    : 'hover:border-primary/50 hover:shadow-lg'
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <div className="mb-6 text-center">
                  <h3 className="mb-2 text-lg font-semibold">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  asChild
                >
                  <a href="#download">{plan.cta}</a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 lg:p-16">
            {/* Background decoration */}
            <div className="absolute right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
                  Download Everlast AI Recorder
                </h2>
                <p className="mb-8 text-lg text-muted-foreground">
                  Available for macOS, Windows, and Linux. Free to use with optional premium
                  features.
                </p>

                {/* Primary download button */}
                <div className="mb-8">
                  <Button size="lg" className="h-16 gap-3 px-8 text-lg" asChild>
                    <a href={primaryDownload.url}>
                      <primaryDownload.icon className="h-6 w-6" />
                      <div className="text-left">
                        <div>{primaryDownload.label}</div>
                        <div className="text-xs opacity-80">{primaryDownload.version}</div>
                      </div>
                    </a>
                  </Button>
                </div>

                {/* Other platforms */}
                <div className="space-y-2">
                  <p className="mb-3 text-sm text-muted-foreground">Also available for:</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(DOWNLOAD_LINKS).map(([os, info]) => {
                      if (os === detectedOS || (detectedOS === 'unknown' && os === 'mac'))
                        return null;
                      return (
                        <Button key={os} variant="outline" size="sm" className="gap-2" asChild>
                          <a href={info.url}>
                            <info.icon className="h-4 w-4" />
                            {info.version}
                          </a>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* System requirements */}
              <div className="lg:pl-12">
                <h3 className="mb-4 text-lg font-semibold">System Requirements</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <AppleIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="font-medium">macOS</div>
                      <div className="text-sm text-muted-foreground">
                        macOS 12 (Monterey) or later, Apple Silicon or Intel
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <WindowsIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Windows</div>
                      <div className="text-sm text-muted-foreground">
                        Windows 10 (1803+) or Windows 11, 64-bit
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <LinuxIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Linux</div>
                      <div className="text-sm text-muted-foreground">
                        Ubuntu 20.04+, Fedora 36+, or equivalent
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> Everlast AI Recorder requires
                    a microphone for voice recording. For AI features, you&apos;ll need API keys
                    from Deepgram, OpenAI, or Anthropic — or use free local alternatives like
                    Whisper and Ollama.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/30 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Ready to transform how you capture ideas?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join thousands of professionals who use Everlast AI Recorder to turn voice into action.
          </p>
          <Button size="lg" className="h-14 gap-2 px-8 text-lg" asChild>
            <a href="#download">
              Get Started Free
              <ArrowRightIcon className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
                  <MicIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">Everlast AI Recorder</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Voice to enriched content, powered by AI.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="transition-colors hover:text-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#integrations" className="transition-colors hover:text-foreground">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-foreground">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#download" className="transition-colors hover:text-foreground">
                    Download
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Everlast AI Recorder. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
