SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.prevent_self_vote()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin
    if exists (
        select 1 from public.submissions s
        where s.id = new.submission_id and s.account_id = new.account_id
    ) then
        raise exception 'You can''t vote for your own submission.';
    end if;
    return new;
end;
$function$;

CREATE TRIGGER prevent_self_vote
  BEFORE INSERT OR UPDATE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_vote();

GRANT EXECUTE ON FUNCTION "public"."prevent_self_vote"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."prevent_self_vote"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."prevent_self_vote"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."prevent_self_vote"() TO "service_role";
