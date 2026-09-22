-- Stage 7: enable Supabase Realtime on notifications so the in-app bell
-- updates without polling (PRD §22.3).
alter publication supabase_realtime add table notifications;
