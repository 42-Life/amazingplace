SET local check_function_bodies = off;

CREATE TABLE "public"."comments" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" uuid                     NOT NULL,
  "body"          text                     NOT NULL,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "edited_at"     timestamp with time zone,
  CONSTRAINT "comments_body_check" CHECK (((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 500))),
  CONSTRAINT "comments_pkey" PRIMARY KEY (id),
  "account_id"    uuid                     NOT NULL DEFAULT public.current_account_id()
);

ALTER TABLE "public"."comments"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."comments" FROM "anon";

CREATE OR REPLACE FUNCTION public.validate_comment_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin
    if new.id <> old.id
       or new.account_id <> old.account_id
       or new.submission_id <> old.submission_id
       or new.created_at <> old.created_at then
        raise exception 'Only a comment''s text can be changed.';
    end if;
    if new.body is distinct from old.body then
        new.edited_at := now();
    else
        new.edited_at := old.edited_at;
    end if;
    return new;
end;
$function$;

ALTER TABLE "public"."comments"
  ADD CONSTRAINT "comments_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;

CREATE INDEX comments_submission_id_created_at_idx ON public.comments USING btree (submission_id, created_at);

CREATE TRIGGER validate_comment_update
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_comment_update();

CREATE POLICY "Signed-in users can view comments" ON "public"."comments"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT EXECUTE ON FUNCTION "public"."validate_comment_update"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."validate_comment_update"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_comment_update"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_comment_update"() TO "service_role";

REVOKE ALL ON TABLE "public"."comments" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."comments" TO "authenticated";

REVOKE ALL ON TABLE "public"."comments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."comments" TO "service_role";

ALTER TABLE "public"."comments"
  ADD CONSTRAINT "comments_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

CREATE INDEX comments_account_id_idx ON public.comments USING btree (account_id);

CREATE POLICY "users delete their own comments" ON "public"."comments"
  FOR DELETE
  TO "authenticated"
  USING ((account_id = public.current_account_id()));

CREATE POLICY "users insert their own comments" ON "public"."comments"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((account_id = public.current_account_id()));

CREATE POLICY "users update their own comments" ON "public"."comments"
  FOR UPDATE
  TO "authenticated"
  USING ((account_id = public.current_account_id()))
  WITH CHECK ((account_id = public.current_account_id()));
