import { useNavigate } from "@/lib/router-compat";
import { useState } from "react";
import { ArrowLeft, Camera, Bug, Hammer, Droplets, HelpCircle, Send } from "lucide-react";
import { useParcels } from "@/lib/parcel-store";
import { useAnomaliesActions, ANOMALY_LABELS, type AnomalyType } from "@/lib/anomalies-store";
import { useAlertActions, uploadAlertPhotos, type AlertKind } from "@/lib/cloud/alerts";
import { useNetworkStatus } from "@/lib/offline/network";
import { toast } from "sonner";

const TYPES: { id: AnomalyType; icon: typeof Bug }[] = [
  { id: "maladie", icon: Bug },
  { id: "casse", icon: Hammer },
  { id: "fuite", icon: Droplets },
  { id: "autre", icon: HelpCircle },
];

function AnomaliePage() {
  const navigate = useNavigate();
  const parcels = useParcels();
  const network = useNetworkStatus();
  const { add } = useAnomaliesActions();
  const { create: createCloudAlert } = useAlertActions();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [parcelId, setParcelId] = useState<string>("");
  const [type, setType] = useState<AnomalyType | "">("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!parcelId || !type) return;
    setSubmitting(true);
    try {
      // 1. Local store (backup hors-ligne)
      add({ parcelId, type, comment, photoDataUrl: photo });
      // 2. Photos -> tampon offline (compression + upload différé, instantané)
      let photo_urls: string[] = [];
      if (photoFile) {
        photo_urls = await uploadAlertPhotos([photoFile]);
      }
      // 3. Alerte -> tampon offline (envoyée dès que le réseau revient)
      await createCloudAlert.mutateAsync({
        parcel_id: parcelId,
        type: type as AlertKind,
        comment,
        photo_urls,
        source_role: "executant",
      });
      if (network === "offline") {
        toast.success("Anomalie enregistrée — sera envoyée dès le retour du réseau");
      } else {
        toast.success("Anomalie signalée");
      }
      navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message || "Échec de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <button
        onClick={() => (step === 1 ? navigate({ to: "/" }) : setStep((step - 1) as 1 | 2 | 3))}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <h1 className="text-xl font-bold">Signaler une anomalie</h1>
      <p className="mb-4 text-sm text-muted-foreground">Étape {step} / 3</p>

      {step === 1 && (
        <section>
          <h2 className="mb-2 font-semibold">Choisir la parcelle</h2>
          <ul className="grid grid-cols-2 gap-3">
            {parcels.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setParcelId(p.id);
                    setStep(2);
                  }}
                  className={`min-h-16 w-full rounded-2xl border p-4 text-left text-base font-semibold shadow-sm active:scale-95 ${
                    parcelId === p.id ? "border-primary bg-primary/10" : "bg-card"
                  }`}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="mb-2 font-semibold">Type d'anomalie</h2>
          <ul className="grid grid-cols-2 gap-3">
            {TYPES.map(({ id, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => {
                    setType(id);
                    setStep(3);
                  }}
                  className={`flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border p-4 shadow-sm active:scale-95 ${
                    type === id ? "border-primary bg-primary/10" : "bg-card"
                  }`}
                >
                  <Icon className="h-10 w-10 text-destructive" />
                  <span className="text-base font-semibold">{ANOMALY_LABELS[id]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Photo et commentaire</h2>
          <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-card text-muted-foreground">
            {photo ? (
              <img src={photo} alt="aperçu" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <>
                <Camera className="h-10 w-10" />
                <span className="text-sm font-medium">Prendre / choisir une photo</span>
              </>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Commentaire (optionnel)"
            className="w-full rounded-2xl border bg-card p-3 text-base"
            rows={4}
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-destructive text-base font-bold text-destructive-foreground active:scale-95 disabled:opacity-60"
          >
            <Send className="h-5 w-5" />
            {submitting ? "Envoi…" : "Envoyer le signalement"}
          </button>
        </section>
      )}
    </main>
  );
}

export default AnomaliePage;
