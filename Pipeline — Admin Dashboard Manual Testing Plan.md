# Pipeline — Admin Dashboard Manual Testing Plan

## Test Environment Setup

- Log in as a verified admin account (use `npm run seed:admin` to create one)
- Have a second regular (non-admin) user account available for access control tests
- Use a browser dev tools Network tab to verify API calls where noted
- Have direct database access (psql / pgAdmin) available for verification edge cases

---

## 1. Access Control & Navigation

### 1.1 Role-Based Route Guard

| # | Test | Expected | |
|---|------|----------|---|
| 1.1.1 | Navigate to `/admin` while logged out | Redirected to `/login` | |
| 1.1.2 | Navigate to `/admin` while logged in as a regular user | Redirected to `/dashboard` | |
| 1.1.3 | Navigate to `/admin/users` while logged in as a regular user | Redirected to `/dashboard` | |
| 1.1.4 | Navigate to `/admin/jobs` while logged in as a regular user | Redirected to `/dashboard` | |
| 1.1.5 | Navigate to `/admin/audit-log` while logged in as a regular user | Redirected to `/dashboard` | |
| 1.1.6 | Navigate to `/admin` while logged in as admin | Admin Overview page loads | |
| 1.1.7 | Log in as admin, then manually edit localStorage role to "user", navigate to `/admin` | Redirected to `/dashboard` | |

### 1.2 Admin Navigation Link

| # | Test | Expected | |
|---|------|----------|---|
| 1.2.1 | Log in as a regular user, check the navbar | No "Admin" link visible | |
| 1.2.2 | Log in as an admin, check the navbar | "Admin" link visible | |
| 1.2.3 | Click the "Admin" navbar link | Navigates to `/admin` (Overview) | |

### 1.3 Admin Sidebar Navigation

| # | Test | Expected | |
|---|------|----------|---|
| 1.3.1 | Visit `/admin`, check sidebar | "Pipeline" brand, "Admin" badge, Overview / Users / Jobs / Audit Log links, and admin email all visible | |
| 1.3.2 | Click "Overview" in sidebar | Navigates to admin dashboard | |
| 1.3.3 | Click "Users" in sidebar | Navigates to user list | |
| 1.3.4 | Click "Jobs" in sidebar | Navigates to job list | |
| 1.3.5 | Click "Audit Log" in sidebar | Navigates to audit log | |
| 1.3.6 | Click "Sign out" in sidebar | Auth cleared, redirected to `/login` | |

---

## 2. Admin Overview

### 2.1 Stats Display

| # | Test | Expected | |
|---|------|----------|---|
| 2.1.1 | Open Overview with known data in the database | Total user count matches database | |
| 2.1.2 | Open Overview | Verified user count is accurate | |
| 2.1.3 | Open Overview with at least one suspended user | Suspended count is accurate and highlighted in red | |
| 2.1.4 | Open Overview with no suspended users | Suspended count shows 0 with no red highlight | |
| 2.1.5 | Open Overview | Admin count is accurate | |
| 2.1.6 | Open Overview | Total job count matches database | |
| 2.1.7 | Open Overview | Applied / Interviewing / Offered / Rejected job counts are each accurate | |
| 2.1.8 | Open Overview when a status has 0 jobs | That status card shows 0 (not blank) | |
| 2.1.9 | Open Overview with server stopped | Error message displayed, no stat cards rendered | |

### 2.2 Quick Links

| # | Test | Expected | |
|---|------|----------|---|
| 2.2.1 | Click "Manage users" quick link | Navigates to `/admin/users` | |
| 2.2.2 | Click "Manage jobs" quick link | Navigates to `/admin/jobs` | |
| 2.2.3 | Click "View audit log" quick link | Navigates to `/admin/audit-log` | |

---

## 3. User Management

### 3.1 User List Display

| # | Test | Expected | |
|---|------|----------|---|
| 3.1.1 | Navigate to `/admin/users` | Paginated table of users loads | |
| 3.1.2 | Each row shows: email, role badge, status badge, job count, join date | All columns correct | |
| 3.1.3 | A user with role "admin" | Shows blue "admin" badge | |
| 3.1.4 | A user with role "user" | Shows grey "user" badge | |
| 3.1.5 | A suspended user | Shows red "suspended" badge | |
| 3.1.6 | An unverified user | Shows grey "unverified" badge | |
| 3.1.7 | A verified, non-suspended user | Shows green "active" badge | |
| 3.1.8 | A user with jobs | Job count column shows correct number | |
| 3.1.9 | No users in the database | "No users found." message | |
| 3.1.10 | Total count displayed above the table | Shows the correct total | |

### 3.2 Search

| # | Test | Expected | |
|---|------|----------|---|
| 3.2.1 | Type a partial email into the search box | Matching users shown after 300ms | |
| 3.2.2 | Type quickly in the search box | API is not called on every keystroke — only after 300ms debounce | |
| 3.2.3 | Search for a term with no matches | "No users found." message | |
| 3.2.4 | Clear the search box | Full user list reloads, page resets to 1 | |
| 3.2.5 | Search with leading/trailing spaces | Trimmed before the API call; results correct | |

### 3.3 Pagination

| # | Test | Expected | |
|---|------|----------|---|
| 3.3.1 | Open users list on page 1 | Prev button is disabled | |
| 3.3.2 | Open users list with more than 20 users | Next button is enabled | |
| 3.3.3 | Open users list with 20 or fewer users | Next button is disabled | |
| 3.3.4 | Click Next | Page 2 loads, correct users shown | |
| 3.3.5 | Click Prev from page 2 | Returns to page 1 | |
| 3.3.6 | Enter a search term while on page 2 | Resets to page 1 | |

### 3.4 User Detail Page

| # | Test | Expected | |
|---|------|----------|---|
| 3.4.1 | Click a user row (or navigate to `/admin/users/:id`) | User detail page loads with correct email in header | |
| 3.4.2 | Detail page for a regular user | Grey "user" role badge visible | |
| 3.4.3 | Detail page for an admin user | Blue "admin" role badge visible | |
| 3.4.4 | Detail page for a suspended user | Red "suspended" status badge visible | |
| 3.4.5 | Detail page for an unverified user | Grey "unverified" status badge visible | |
| 3.4.6 | Detail page for an active user | Green "active" status badge visible | |
| 3.4.7 | Application stats section | Total / Applied / Interviewing / Offered / Rejected counts all correct | |
| 3.4.8 | Click "← Users" back link | Returns to user list | |
| 3.4.9 | Navigate to `/admin/users/nonexistent-id` | Error message displayed | |

### 3.5 Role Management

| # | Test | Expected | |
|---|------|----------|---|
| 3.5.1 | Detail page for a regular user | "Promote to admin" button shown | |
| 3.5.2 | Detail page for an admin user | "Demote to user" button shown | |
| 3.5.3 | Click "Promote to admin" | Success message appears, role badge updates to "admin", button changes to "Demote to user" — without page reload | |
| 3.5.4 | Click "Demote to user" | Success message appears, role badge updates to "user", button changes to "Promote to admin" — without page reload | |
| 3.5.5 | Promote a user, then check the audit log | SET_ROLE entry recorded with correct admin email and target | |
| 3.5.6 | Demote an admin to user while that admin is logged in, then try to access `/admin` in their session | Redirected to `/dashboard` on next navigation or token refresh | |

### 3.6 Suspension

| # | Test | Expected | |
|---|------|----------|---|
| 3.6.1 | Detail page for an active user | "Suspend" button shown in suspension card | |
| 3.6.2 | Detail page for a suspended user | "Unsuspend" button shown | |
| 3.6.3 | Click "Suspend" | Success message, status badge updates to "suspended", button changes to "Unsuspend" — without page reload | |
| 3.6.4 | Click "Unsuspend" | Success message, status badge updates to "active", button changes to "Suspend" | |
| 3.6.5 | Suspend a user, then try to log in as that user | Error: "Your account has been suspended." | |
| 3.6.6 | Unsuspend a user, then log in as that user | Login succeeds | |
| 3.6.7 | Suspend action is recorded in the audit log | SUSPEND_USER entry present with correct metadata | |
| 3.6.8 | Unsuspend action is recorded in the audit log | UNSUSPEND_USER entry present | |
| 3.6.9 | Attempt to suspend your own admin account (via API) | 403 Forbidden | |

### 3.7 Verification

| # | Test | Expected | |
|---|------|----------|---|
| 3.7.1 | Detail page for an already-verified user | "Force verify" and "Resend email" buttons are both disabled | |
| 3.7.2 | Detail page for an unverified user | "Force verify" and "Resend email" buttons are both enabled | |
| 3.7.3 | Click "Force verify" for an unverified user | Success message, status badge updates to "active", both verification buttons become disabled | |
| 3.7.4 | After force-verifying, the user can log in | Login succeeds without clicking an email link | |
| 3.7.5 | Click "Resend email" for an unverified user | Success message: "Verification email sent." Verification buttons remain enabled | |
| 3.7.6 | Force verify action recorded in audit log | FORCE_VERIFY entry present | |
| 3.7.7 | Resend verification action recorded in audit log | RESEND_VERIFICATION entry present | |

### 3.8 Password Reset

| # | Test | Expected | |
|---|------|----------|---|
| 3.8.1 | Click "Send reset email" | Success message: "Password reset email sent." | |
| 3.8.2 | User receives the password reset email | Email arrives and reset link works | |
| 3.8.3 | Action recorded in audit log | TRIGGER_PASSWORD_RESET entry present | |

### 3.9 Delete User

| # | Test | Expected | |
|---|------|----------|---|
| 3.9.1 | Click "Delete user" | Confirmation dialog appears with the user's email | |
| 3.9.2 | Click "Delete user", then cancel the dialog | User is not deleted, page unchanged | |
| 3.9.3 | Click "Delete user", confirm | Navigated to `/admin/users`, user no longer in list | |
| 3.9.4 | After deleting a user, their jobs no longer appear in `/admin/jobs` | Jobs table shows no entries for that user | |
| 3.9.5 | Delete action recorded in audit log | DELETE_USER entry present with target email in metadata | |
| 3.9.6 | Attempt to delete your own admin account (via API) | 403 Forbidden | |

### 3.10 Feedback Messages

| # | Test | Expected | |
|---|------|----------|---|
| 3.10.1 | Perform any successful action (e.g. promote) | Green success message appears below the header | |
| 3.10.2 | Wait 4 seconds after a success message appears | Message automatically disappears | |
| 3.10.3 | Trigger a failed action (e.g. network disconnected, attempt an action) | Red error message appears | |
| 3.10.4 | Perform a second action while a message is showing | Previous message replaced by new one, timer resets | |

---

## 4. Job Management

### 4.1 Job List Display

| # | Test | Expected | |
|---|------|----------|---|
| 4.1.1 | Navigate to `/admin/jobs` | Paginated table of all users' jobs loads | |
| 4.1.2 | Each row shows: company, title, status pill, owner email, date applied, delete button | All columns correct | |
| 4.1.3 | Status pill for each status | Correct colour for applied / interviewing / offered / rejected | |
| 4.1.4 | A job with no associated user | Owner column shows "—" | |
| 4.1.5 | No jobs in the database | "No jobs found." message | |
| 4.1.6 | Total count displayed above the table | Shows the correct total | |

### 4.2 Search

| # | Test | Expected | |
|---|------|----------|---|
| 4.2.1 | Search by partial company name | Matching jobs shown after 300ms | |
| 4.2.2 | Search by partial job title | Matching jobs shown | |
| 4.2.3 | Type quickly in the search box | Debounced — API not called on every keystroke | |
| 4.2.4 | Search with no matches | "No jobs found." message | |
| 4.2.5 | Clear the search box | Full list reloads, page resets to 1 | |

### 4.3 Pagination

| # | Test | Expected | |
|---|------|----------|---|
| 4.3.1 | Open jobs list on page 1 | Prev button is disabled | |
| 4.3.2 | More than 20 jobs exist | Next button is enabled | |
| 4.3.3 | Click Next | Page 2 loads | |
| 4.3.4 | Click Prev | Returns to previous page | |
| 4.3.5 | Enter a search term while on page 2 | Resets to page 1 | |

### 4.4 Single Job Delete

| # | Test | Expected | |
|---|------|----------|---|
| 4.4.1 | Click "Delete" on a job row | Confirmation dialog appears | |
| 4.4.2 | Cancel the confirmation | Job remains in the list | |
| 4.4.3 | Confirm the deletion | Job removed from the table immediately, total count decrements | |
| 4.4.4 | Delete succeeds and is recorded in audit log | DELETE_JOB entry with company and title in metadata | |
| 4.4.5 | Delete fails (network error) | Error message shown above the table | |

### 4.5 Bulk Delete

| # | Test | Expected | |
|---|------|----------|---|
| 4.5.1 | No checkboxes selected | Bulk actions bar is not visible | |
| 4.5.2 | Check one job checkbox | Bulk actions bar appears showing "1 selected" | |
| 4.5.3 | Check multiple checkboxes | Selected count updates correctly | |
| 4.5.4 | Click "Clear" in bulk actions bar | All checkboxes deselected, bar disappears | |
| 4.5.5 | Select jobs and click "Delete selected" | Confirmation dialog appears with count | |
| 4.5.6 | Cancel the bulk delete confirmation | Jobs remain, selection preserved | |
| 4.5.7 | Confirm bulk delete | Selected jobs removed from table, total decrements by correct amount, selection cleared, bulk bar disappears | |
| 4.5.8 | Bulk delete recorded in audit log | BULK_DELETE_JOBS entry with count in metadata | |
| 4.5.9 | Bulk delete fails (network error) | Error message shown, jobs remain in the table | |
| 4.5.10 | Select all jobs on a page and delete them | Table shows remaining jobs or "No jobs found." | |

---

## 5. Audit Log

### 5.1 Log Display

| # | Test | Expected | |
|---|------|----------|---|
| 5.1.1 | Navigate to `/admin/audit-log` with no entries | "No audit log entries yet." message | |
| 5.1.2 | Perform an admin action, then view the log | New entry appears at the top | |
| 5.1.3 | Each row shows: admin email, action label, target type, target ID (abbreviated), detail, timestamp | All columns correct | |
| 5.1.4 | Target ID is longer than 8 characters | First 8 chars shown followed by "…" | |
| 5.1.5 | Entry for a BULK_DELETE_JOBS action | Target ID column is blank/empty | |
| 5.1.6 | Total entry count displayed | Correct total shown | |

### 5.2 Action Labels & Colour Coding

| # | Test | Expected | |
|---|------|----------|---|
| 5.2.1 | DELETE_USER action in the log | Label "Deleted user", red danger styling | |
| 5.2.2 | SUSPEND_USER action in the log | Label contains "Suspended", red danger styling | |
| 5.2.3 | DELETE_JOB action in the log | Label contains "Deleted job", red danger styling | |
| 5.2.4 | BULK_DELETE_JOBS action in the log | Label "Bulk deleted jobs", red danger styling | |
| 5.2.5 | SET_ROLE action in the log | Label "Set role", orange/warn styling | |
| 5.2.6 | TRIGGER_PASSWORD_RESET action in the log | Warn styling | |
| 5.2.7 | FORCE_VERIFY action in the log | Neutral styling | |
| 5.2.8 | UNSUSPEND_USER action in the log | Neutral styling | |
| 5.2.9 | RESEND_VERIFICATION action in the log | Neutral styling | |

### 5.3 Metadata / Detail Column

| # | Test | Expected | |
|---|------|----------|---|
| 5.3.1 | Entry with a targetEmail in metadata (e.g. DELETE_USER) | Target email shown in detail column | |
| 5.3.2 | Entry with company and title in metadata (e.g. DELETE_JOB) | Detail shows "Company — Title" format | |
| 5.3.3 | BULK_DELETE_JOBS entry with a count | Detail shows "N jobs" | |
| 5.3.4 | Entry with no metadata | Detail column shows "—" | |

### 5.4 Pagination

| # | Test | Expected | |
|---|------|----------|---|
| 5.4.1 | Open audit log on page 1 | Prev button is disabled | |
| 5.4.2 | More than 50 entries exist | Next button is enabled | |
| 5.4.3 | Click Next | Page 2 loads, older entries shown | |
| 5.4.4 | Click Prev | Returns to page 1 | |
| 5.4.5 | Entries are ordered newest first | Most recent action is at the top of page 1 | |

### 5.5 Immutability

| # | Test | Expected | |
|---|------|----------|---|
| 5.5.1 | Delete a user who appears as the target of an audit log entry | Log entry still shows their email (denormalised) | |
| 5.5.2 | Seed script (`npm run seed:admin`) creates or promotes an admin | No new entry appears in the audit log | |
| 5.5.3 | `npm run make-admin` promotes an account | No new entry in the audit log | |

---

## 6. Security

### 6.1 API Access Control

| # | Test | Expected | |
|---|------|----------|---|
| 6.1.1 | Call `GET /admin/stats` with no token (curl/Postman) | 401 Unauthorized | |
| 6.1.2 | Call `GET /admin/users` with a valid non-admin JWT | 403 Forbidden | |
| 6.1.3 | Call `DELETE /admin/users/:id` with a valid non-admin JWT | 403 Forbidden | |
| 6.1.4 | Call `GET /admin/audit-log` with a valid non-admin JWT | 403 Forbidden | |
| 6.1.5 | Call `DELETE /admin/jobs` (bulk) with a valid non-admin JWT | 403 Forbidden | |

### 6.2 Self-Protection Guards

| # | Test | Expected | |
|---|------|----------|---|
| 6.2.1 | Call `DELETE /admin/users/:ownId` using your own admin JWT | 403 Forbidden — cannot delete yourself | |
| 6.2.2 | Call `PATCH /admin/users/:ownId/suspend` using your own admin JWT | 403 Forbidden — cannot suspend yourself | |
| 6.2.3 | Call `PATCH /admin/users/:ownId/role` with `{ role: "user" }` using your own admin JWT | 403 Forbidden — cannot demote yourself | |

### 6.3 Input & Injection

| # | Test | Expected | |
|---|------|----------|---|
| 6.3.1 | Search users with `?search=<script>alert(1)</script>` | No XSS, script not executed | |
| 6.3.2 | Search jobs with a SQL injection attempt (e.g. `' OR '1'='1`) | No data leak, normal empty result or error | |
| 6.3.3 | Navigate to `/admin/users/not-a-uuid` | Error message, no 500 crash | |

---

## 7. Seed Scripts

| # | Test | Expected | |
|---|------|----------|---|
| 7.1 | Run `npm run seed:admin` with valid env vars for a new email | Admin account created, `isVerified = true`, login succeeds | |
| 7.2 | Run `npm run seed:admin` again with the same email | Existing account promoted to admin (no duplicate created) | |
| 7.3 | Run `npm run seed:admin` without `ADMIN_SEED_EMAIL` set | Script exits with a clear error message | |
| 7.4 | Run `npm run seed:users` | 10 users created by default, all `isVerified = true` | |
| 7.5 | Run `npm run seed:users -- --count=25` | 25 users created | |
| 7.6 | Run `npm run seed:users` twice | Second run skips already-existing emails, reports skip count | |
| 7.7 | Run `npm run seed:jobs -- --count=50` | 50 jobs distributed across existing users | |
| 7.8 | Run `npm run make-admin -- existing@example.com` | Account promoted to admin | |
| 7.9 | Run `npm run make-admin -- unknown@example.com` | Script exits with a clear "user not found" error | |
