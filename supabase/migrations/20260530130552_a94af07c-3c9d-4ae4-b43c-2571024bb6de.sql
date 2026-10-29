
CREATE POLICY "records ingenieur insert"
ON public.module_records
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ingenieur'::app_role)
  AND created_by = auth.uid()
);

CREATE POLICY "records ingenieur update"
ON public.module_records
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'ingenieur'::app_role))
WITH CHECK (has_role(auth.uid(), 'ingenieur'::app_role));
