import {
  Zap,
  Flame,
  SmilePlus,
  Sparkles,
  Eye,
  FileText,
  Clock,
  Smile,
  ShieldAlert,
  Video,
  Layers,
  HeartCrack,
  Cross,
  Users,
  Home,
  Moon,
  Globe,
  Tv,
  KeyRound,
  Trees,
  Ghost,
  Clapperboard,
  Skull,
  Radio,
  Rainbow,
  Coffee,
  Swords,
  Music,
  Search,
  Crown,
  Film,
  Tv2,
  Heart,
  Rocket,
  Scissors,
  Trophy,
  Glasses,
  Mic,
  Shield,
  AlertTriangle,
  Compass,
  type LucideProps,
} from "lucide-react";

interface CategoryIconProps extends LucideProps {
  name: string;
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
  switch (name) {
    case "Zap": return <Zap {...props} />;
    case "Flame": return <Flame {...props} />;
    case "SmilePlus": return <SmilePlus {...props} />;
    case "Sparkles": return <Sparkles {...props} />;
    case "Eye": return <Eye {...props} />;
    case "FileText": return <FileText {...props} />;
    case "Clock": return <Clock {...props} />;
    case "Smile": return <Smile {...props} />;
    case "ShieldAlert": return <ShieldAlert {...props} />;
    case "Video": return <Video {...props} />;
    case "Layers": return <Layers {...props} />;
    case "HeartCrack": return <HeartCrack {...props} />;
    case "Cross": return <Cross {...props} />;
    case "Users": return <Users {...props} />;
    case "Home": return <Home {...props} />;
    case "Moon": return <Moon {...props} />;
    case "Globe": return <Globe {...props} />;
    case "Tv": return <Tv {...props} />;
    case "KeyRound": return <KeyRound {...props} />;
    case "Trees": return <Trees {...props} />;
    case "Ghost": return <Ghost {...props} />;
    case "Clapperboard": return <Clapperboard {...props} />;
    case "Skull": return <Skull {...props} />;
    case "Radio": return <Radio {...props} />;
    case "Rainbow": return <Rainbow {...props} />;
    case "Coffee": return <Coffee {...props} />;
    case "Swords": return <Swords {...props} />;
    case "Music": return <Music {...props} />;
    case "Search": return <Search {...props} />;
    case "Crown": return <Crown {...props} />;
    case "Film": return <Film {...props} />;
    case "Tv2": return <Tv2 {...props} />;
    case "Heart": return <Heart {...props} />;
    case "Rocket": return <Rocket {...props} />;
    case "Scissors": return <Scissors {...props} />;
    case "Trophy": return <Trophy {...props} />;
    case "Glasses": return <Glasses {...props} />;
    case "Mic": return <Mic {...props} />;
    case "Shield": return <Shield {...props} />;
    case "AlertTriangle": return <AlertTriangle {...props} />;
    case "Compass": return <Compass {...props} />;
    default: return <Film {...props} />;
  }
}
