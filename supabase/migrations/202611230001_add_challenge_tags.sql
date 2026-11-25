-- Add category tags to challenges.
-- Existing challenges are assigned 'other' so every challenge satisfies the 1-tag minimum.
alter table public.challenges
    add column if not exists tags text[] not null default array['other']::text[];

update public.challenges
set tags = array['other']::text[]
where tags is null or cardinality(tags) = 0;

alter table public.challenges
    alter column tags set default array['other']::text[],
alter column tags set not null;

-- Validate IDs and enforce the 1-3 tag limit at the database boundary.
alter table public.challenges
drop constraint if exists challenges_tags_valid;

alter table public.challenges
    add constraint challenges_tags_valid check (
        cardinality(tags) between 1 and 3
            and tags <@ array[
            'pranks_humor',
    'dares_skits',
    'everyday_life',
    'nature_scenery',
    'art_music',
    'sports_fitness',
    'photography',
    'food_drink',
    'animals_pets',
    'scavenger_hunt',
    'community_kindness',
    'other'
    ]::text[]
    );
