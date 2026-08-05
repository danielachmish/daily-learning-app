insert into settings (key, value) values
  ('dedication_price', '36'),
  ('dedication_enabled', 'true'),
  ('monthly_price', '20'),
  ('yearly_price', '200')
on conflict (key) do nothing;
