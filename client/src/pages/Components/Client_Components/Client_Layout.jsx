import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Client_Sidebar from "./Client_Sidebar.jsx";
import ClientHeader from "./ClientHeader.jsx";
import DraggableChatHead from "../../../components/chat/DraggableChatHead.jsx";

import { getEnabledClientModules } from "../../../services/operations/client_modules";
import { supabase } from "../../../config/supabaseClient.js";

function Client_Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moduleContext, setModuleContext] = useState(null);
  const [loadingModules, setLoadingModules] = useState(true);

  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function loadModules() {
      try {
        setLoadingModules(true);
        const data = await getEnabledClientModules();

        if (mounted) {
          setModuleContext(data);
        }
      } catch (err) {
        console.error("Client layout module load error:", err);

        if (mounted) {
          setModuleContext(null);
        }
      } finally {
        if (mounted) {
          setLoadingModules(false);
        }
      }
    }

    loadModules();

    return () => {
      mounted = false;
    };
  }, []);

  /* Close sidebar + scroll to top on navigation */
  useEffect(() => {
    setSidebarOpen(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  /* Re-fetch profile whenever avatar/name is updated */
  useEffect(() => {
    async function refreshProfile() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      if (profile) {
        setModuleContext(prev => prev ? { ...prev, profile } : prev);
      }
    }
    window.addEventListener("profileUpdated", refreshProfile);
    return () => window.removeEventListener("profileUpdated", refreshProfile);
  }, []);

  const activeSection = useMemo(() => {
    const navSections = moduleContext?.navSections || [];

    return navSections.find((section) =>
      section.items.some((item) => item.clientRoute === location.pathname)
    );
  }, [location.pathname, moduleContext?.navSections]);

  return (
    <div className="admin-shell h-screen w-full overflow-hidden bg-[var(--bg-app)]">
      <Client_Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        modules={moduleContext?.modules || []}
        user={moduleContext?.profile}
        workspace={moduleContext?.workspace}
        loading={loadingModules}
      />

      <div className="flex h-screen min-w-0 flex-col lg:ml-[280px]">
        <ClientHeader
          onMenu={() => setSidebarOpen(true)}
          title={activeSection?.title || "Client Portal"}
          user={moduleContext?.profile}
          workspace={moduleContext?.workspace}
        />

        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg-app)] px-4 py-4 lg:px-6 lg:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet context={moduleContext} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <DraggableChatHead userRole="client" moduleContext={activeSection?.title || "Client Portal"} />
    </div>
  );
}

export default Client_Layout;
