import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAdminStatus = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (mounted) { setIsAdmin(false); setLoading(false); }
        return;
      }

      const { data } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (mounted) {
        setIsAdmin(!!data);
        setLoading(false);
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
};
