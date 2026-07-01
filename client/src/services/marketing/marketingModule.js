import React from "react";
import { Ribbon as RibbonIcon } from "lucide-react";

export default {
  name: 'Marketing',
  id: 'marketing-module',
  sidebarItems: [
    {
      name: 'Lead Generator',
      id: 'lead-generator',
      path: '/marketing/lead-generation',
      icon: <RibbonIcon />,
      load: async () => import('./LeadGeneration').then(module => module.default),
      beforeUnload: () => { /* Unload logic if needed */ }
    }
  ],
  initModule: () => {
    // Optional initialization logic
  }
};