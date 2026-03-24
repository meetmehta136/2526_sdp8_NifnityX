import {
  LayoutDashboard,
  Radio,
  LineChart,
  History,
  Settings2,
  KeyRound,
  Newspaper,
} from "lucide-react";

export const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Signals",
    url: "/signals",
    icon: Radio,
  },
  {
    title: "Trade History",
    url: "/history",
    icon: History,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: LineChart,
  },
  {
    title: "Market News",
    url: "/news",
    icon: Newspaper,
  },
  {
    title: "Strategy Tuner",
    url: "/strategy",
    icon: Settings2,
  },
  {
    title: "Broker Keys",
    url: "/broker",
    icon: KeyRound,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
  },
];