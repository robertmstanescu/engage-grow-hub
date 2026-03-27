import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";

const Admin = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdmin(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    setIsAdmin(!!data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="admin-light min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
        <p className="font-body text-sm" style={{ color: "hsl(260 20% 40%)" }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <div className="admin-light"><AdminLogin /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="admin-light min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(30 20% 96%)" }}>
        <p className="font-body text-sm" style={{ color: "hsl(260 20% 40%)" }}>Access denied. You are not an admin.</p>
      </div>
    );
  }

  return (
    <div className="admin-light">
      <AdminDashboard session={session} />
    </div>
  );
};

export default Admin;
