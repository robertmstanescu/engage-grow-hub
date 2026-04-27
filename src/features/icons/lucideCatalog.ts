/**
 * Categorised Lucide icon catalog for the picker.
 *
 * Each icon is mapped to ONE primary category for the sidebar nav.
 * The "All" category is derived at runtime from the full lucide-react
 * `icons` export, so we never miss new icons added by the library —
 * categorisation is purely a UX aid for browsing.
 *
 * Names use Lucide's PascalCase keys (matching the runtime `icons` map).
 */

export interface IconCategory {
  id: string;
  label: string;
  icons: string[];
}

export const ICON_CATEGORIES: IconCategory[] = [
  {
    id: "communication",
    label: "Communication",
    icons: [
      "MessageCircle", "MessageSquare", "MessagesSquare", "Mail", "MailOpen", "Mails",
      "Send", "Inbox", "Bell", "BellRing", "BellOff", "Megaphone", "Mic", "MicOff", "Mic2",
      "Phone", "PhoneCall", "PhoneIncoming", "PhoneOutgoing", "Speech", "Voicemail",
      "Headphones", "Radio", "Rss", "AtSign", "Hash", "Reply", "Forward", "Share", "Share2",
    ],
  },
  {
    id: "people",
    label: "People & Roles",
    icons: [
      "User", "UserCircle", "UserCircle2", "Users", "Users2", "UserCheck", "UserPlus", "UserMinus",
      "UserX", "UserCog", "UserSearch", "UserRound", "UsersRound", "Crown", "Handshake", "Heart",
      "HeartHandshake", "Baby", "PersonStanding", "Accessibility", "Contact", "Contact2", "IdCard",
    ],
  },
  {
    id: "business",
    label: "Business & Charts",
    icons: [
      "Briefcase", "BriefcaseBusiness", "Building", "Building2", "Factory", "Store", "Warehouse",
      "Globe", "Globe2", "BarChart", "BarChart2", "BarChart3", "BarChart4", "LineChart", "PieChart",
      "AreaChart", "ScatterChart", "TrendingUp", "TrendingDown", "Target", "Trophy", "Award",
      "Medal", "Flag", "FlagTriangleRight", "ChartNoAxesColumn", "ChartPie", "ChartLine",
    ],
  },
  {
    id: "ideas",
    label: "Ideas & Strategy",
    icons: [
      "Lightbulb", "LightbulbOff", "Sparkles", "Sparkle", "Star", "StarHalf", "StarOff",
      "Zap", "ZapOff", "Rocket", "Compass", "Map", "MapPin", "MapPinned", "Navigation",
      "Brain", "BrainCircuit", "BrainCog", "Eye", "EyeOff", "Search", "SearchCheck", "Telescope",
      "Glasses", "Microscope",
    ],
  },
  {
    id: "tools",
    label: "Tools & Objects",
    icons: [
      "Wrench", "Hammer", "Cog", "Settings", "Settings2", "Sliders", "SlidersHorizontal",
      "PenTool", "Pen", "Pencil", "PencilRuler", "Edit", "Edit2", "Edit3",
      "FileText", "File", "FilePlus", "FileCheck", "Files", "Folder", "FolderOpen", "FolderPlus",
      "Archive", "Database", "DatabaseZap", "Server", "Layers", "Layers2", "Layers3",
      "Package", "Package2", "Box", "Boxes", "Container", "Paperclip", "Pin", "PushPin",
    ],
  },
  {
    id: "time",
    label: "Time & Calendar",
    icons: [
      "Calendar", "CalendarDays", "CalendarCheck", "CalendarClock", "CalendarHeart",
      "CalendarPlus", "CalendarRange", "Clock", "Clock1", "Clock2", "Clock3", "Clock4",
      "Timer", "TimerReset", "Hourglass", "AlarmClock", "AlarmClockCheck", "History",
    ],
  },
  {
    id: "status",
    label: "Status & Feedback",
    icons: [
      "Check", "CheckCheck", "CheckCircle", "CheckCircle2", "CheckSquare", "X", "XCircle",
      "XSquare", "AlertCircle", "AlertTriangle", "AlertOctagon", "Info", "HelpCircle",
      "BadgeCheck", "BadgeAlert", "BadgeInfo", "BadgeX", "ShieldCheck", "ShieldAlert",
      "Shield", "ShieldOff", "ThumbsUp", "ThumbsDown", "CircleCheck", "CircleX",
    ],
  },
  {
    id: "movement",
    label: "Arrows & Movement",
    icons: [
      "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "ArrowUpRight", "ArrowDownRight",
      "ArrowUpLeft", "ArrowDownLeft", "ArrowBigRight", "ArrowBigLeft", "ArrowBigUp", "ArrowBigDown",
      "MoveRight", "MoveLeft", "MoveUp", "MoveDown", "MoveHorizontal", "MoveVertical",
      "ChevronRight", "ChevronLeft", "ChevronUp", "ChevronDown", "ChevronsRight", "ChevronsLeft",
      "Play", "Pause", "SkipForward", "SkipBack", "FastForward", "Rewind", "Repeat", "Shuffle",
    ],
  },
  {
    id: "money",
    label: "Money & Commerce",
    icons: [
      "DollarSign", "Euro", "PoundSterling", "JapaneseYen", "IndianRupee", "Bitcoin",
      "CreditCard", "Wallet", "Wallet2", "WalletCards", "Banknote", "Coins", "Receipt",
      "ShoppingBag", "ShoppingCart", "ShoppingBasket", "Tag", "Tags", "Ticket", "Gift",
      "Percent", "PiggyBank", "HandCoins", "Landmark",
    ],
  },
  {
    id: "nature",
    label: "Nature & Weather",
    icons: [
      "Leaf", "Trees", "TreePine", "TreeDeciduous", "Flower", "Flower2", "Sprout", "Seedling",
      "Sun", "SunMedium", "SunDim", "Sunrise", "Sunset", "Moon", "MoonStar", "Cloud", "CloudSun",
      "CloudRain", "CloudSnow", "CloudLightning", "Droplet", "Droplets", "Flame", "Mountain",
      "MountainSnow", "Waves", "Wind", "Snowflake", "Rainbow",
    ],
  },
  {
    id: "learning",
    label: "Books & Learning",
    icons: [
      "BookOpen", "BookOpenCheck", "BookOpenText", "Book", "BookMarked", "BookCopy", "Books",
      "GraduationCap", "Library", "LibraryBig", "Bookmark", "BookmarkCheck", "BookmarkPlus",
      "School", "School2", "NotebookPen", "Notebook", "Newspaper",
    ],
  },
  {
    id: "tech",
    label: "Tech & Web",
    icons: [
      "Code", "Code2", "CodeXml", "Terminal", "TerminalSquare", "Cpu", "Wifi", "WifiOff",
      "Link", "Link2", "Unlink", "Unlink2", "Smartphone", "Tablet", "Laptop", "Laptop2",
      "Monitor", "MonitorSmartphone", "Mouse", "Keyboard", "MemoryStick", "HardDrive",
      "Bluetooth", "Cast", "Cloud", "CloudUpload", "CloudDownload", "Webhook", "Bot",
    ],
  },
  {
    id: "media",
    label: "Media & Creative",
    icons: [
      "Camera", "CameraOff", "Image", "ImagePlus", "Images", "Video", "VideoOff", "Film",
      "Music", "Music2", "Music3", "Music4", "Disc", "Disc2", "Disc3", "AudioLines",
      "AudioWaveform", "Palette", "Paintbrush", "Paintbrush2", "Brush", "Pipette", "Aperture",
      "Focus", "Crop", "Scissors", "Theater",
    ],
  },
  {
    id: "security",
    label: "Security & Layout",
    icons: [
      "Lock", "LockOpen", "Unlock", "Key", "KeyRound", "Fingerprint", "ScanFace",
      "Filter", "FilterX", "Layout", "LayoutDashboard", "LayoutGrid", "LayoutList",
      "LayoutPanelLeft", "LayoutPanelTop", "Grid", "Grid2x2", "Grid3x3", "List", "ListChecks",
      "ListOrdered", "Menu", "MoreHorizontal", "MoreVertical",
    ],
  },
  {
    id: "misc",
    label: "Misc",
    icons: [
      "Coffee", "CupSoda", "UtensilsCrossed", "Quote", "Puzzle", "Anchor", "Bookmark",
      "Beaker", "FlaskConical", "TestTube", "Atom", "Dna", "Pill", "Stethoscope",
      "Activity", "HeartPulse", "Bike", "Car", "Bus", "Plane", "Train", "Ship",
      "Home", "House", "DoorOpen", "DoorClosed", "Bed", "Sofa", "Lamp",
    ],
  },
];

/** Backwards-compat: flat list of common icons (used as a fallback default). */
export const COMMON_LUCIDE_ICONS: string[] = ICON_CATEGORIES.flatMap((c) => c.icons);
