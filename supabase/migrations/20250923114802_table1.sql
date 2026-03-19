create bucket if not exists "logo" with (public = false);
create bucket if not exists "product-images" with (public = true);

create policy "Give users access to own folder 1zbfv_0"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'logo'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));


create policy "image 1zbfv_0"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'logo'::text));


create policy "image 1zbfv_1"
on "storage"."objects"
as permissive
for select
to authenticated
using ((bucket_id = 'logo'::text));


create policy "image 1zbfv_2"
on "storage"."objects"
as permissive
for update
to authenticated
using ((bucket_id = 'logo'::text));


create policy "img 16wiy3a_0"
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'product-images'::text));


create policy "img 16wiy3a_1"
on "storage"."objects"
as permissive
for insert
to public
with check ((bucket_id = 'product-images'::text));


create policy "img 16wiy3a_2"
on "storage"."objects"
as permissive
for delete
to public
using ((bucket_id = 'product-images'::text));


create policy "insertion image 1zbfv_0"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'logo'::text));



