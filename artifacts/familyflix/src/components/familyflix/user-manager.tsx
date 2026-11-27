import { useState } from "react";
import { UsersRound, Search, Shield, Ban, Check, KeyRound, UserCheck, UserX } from "lucide-react";
import { useListStaff, useUpdateStaff } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListStaffQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export function UserManager() {
  const qc = useQueryClient();
  const staffQuery = useListStaff();
  const updateMutation = useUpdateStaff();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [resetModalUser, setResetModalUser] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const users = staffQuery.data ?? [];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  function handleRoleChange(id: string, role: string) {
    updateMutation.mutate(
      { id, data: { action: "role", role: role as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListStaffQueryKey() });
          setMessage("Role updated successfully.");
          setTimeout(() => setMessage(""), 3000);
        },
        onError: (err: any) => setMessage(err.message || "Failed to update role."),
      }
    );
  }

  function handleToggleBan(id: string, isBanned: boolean) {
    updateMutation.mutate(
      { id, data: { action: isBanned ? "unban" : "ban" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListStaffQueryKey() });
          setMessage(isBanned ? "Account enabled." : "Account suspended.");
          setTimeout(() => setMessage(""), 3000);
        },
        onError: (err: any) => setMessage(err.message || "Action failed."),
      }
    );
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetModalUser || newPassword.length < 10) return;

    updateMutation.mutate(
      { id: resetModalUser.id, data: { action: "password", password: newPassword } },
      {
        onSuccess: () => {
          setMessage(`Password reset for ${resetModalUser.name}.`);
          setResetModalUser(null);
          setNewPassword("");
          setTimeout(() => setMessage(""), 3000);
        },
        onError: (err: any) => setMessage(err.message || "Failed to reset password."),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">User & Access Management</h2>
          <p className="text-xs text-white/50">
            Search, assign roles (Admin, Moderator, Viewer), suspend accounts, and reset credentials.
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs font-semibold text-purple-300">
          {message}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-2.5 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full rounded-xl border border-white/15 bg-black/50 pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-purple-400"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
        >
          <option value="all">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="moderator">Moderators</option>
          <option value="user">Standard Viewers</option>
        </select>
      </div>

      {/* User Table */}
      <div className="rounded-2xl border border-white/10 bg-[#12161b] overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-white/80">
          <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-white/40">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td className="p-4">
                  <div className="font-bold text-white">{u.name}</div>
                  <div className="text-[11px] text-white/40">{u.email}</div>
                </td>
                <td className="p-4">
                  <select
                    value={u.role || "user"}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="rounded-lg border border-white/15 bg-black/50 px-2.5 py-1 text-xs text-white outline-none focus:border-purple-400 cursor-pointer"
                  >
                    <option value="admin">Administrator</option>
                    <option value="moderator">Moderator</option>
                    <option value="user">Viewer</option>
                  </select>
                </td>
                <td className="p-4">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      u.banned
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    )}
                  >
                    {u.banned ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser({ id: u.id, name: u.name })}
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/20 transition"
                    title="Reset Password"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleBan(u.id, Boolean(u.banned))}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                      u.banned
                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                    )}
                  >
                    {u.banned ? "Unban" : "Suspend"}
                  </button>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-white/40">
                  No users found matching the query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-[#140f22] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Reset Password for {resetModalUser.name}
            </h3>
            <p className="text-xs text-white/50 mb-4">
              Enter a temporary password with at least 10 characters.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (10+ characters)"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-500 shadow-md shadow-purple-600/30"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
