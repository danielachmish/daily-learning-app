-- Allow a user to delete their own dedication only while it's still awaiting
-- payment. Once paid, it stays as a permanent record (admin can still remove
-- it via dedications_admin_all).
create policy dedications_delete_own_pending on dedications
  for delete using (user_id = auth.uid() and payment_status = 'pending');
