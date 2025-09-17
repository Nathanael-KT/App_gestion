import { useCurrentUser } from "./useCurrentUser";
import { useCompanySettings } from "./useCompanySettings";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jsPDF: any = null;
if (typeof window !== "undefined") {
  try {
    jsPDF = (await import("jspdf")).jsPDF;
  } catch (err) {
    console.error("Erreur lors de l'import jsPDF:", err);
    jsPDF = null;
  }
}

const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { fetchCompanySettings } = useCompanySettings();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (companyId.value) await fetchCompanySettings(companyId.value);

  fetchInvoiceDetails();
});
interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  quantity: number;
  price: number;
  is_external?: boolean;
  external_description?: string;
  external_reference?: string;
  products_carreaux?: {
    id: string;
    name: string;
    reference: string;
    description?: string;
    type_produit?: string;
  };
}

interface Invoice {
  id: string;
  client_id: string;
  date: string;
  total: number;
  status: string;
  reference?: string;
  clients: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference?: string;
}

export const usePdfGenerator = () => {
  const supabase = useSupabaseClient();

  // Utilisation du composable pour les paramètres de l'entreprise
  const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
  const { settings: companySettings, fetchCompanySettings } =
    useCompanySettings();

  const fetchInvoiceDetails = async (
    invoiceId: string
  ): Promise<{
    invoice: Invoice;
    items: InvoiceItem[];
  }> => {
    try {
      // Récupérer les détails de la facture avec le client
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `
          *,
          clients (
            id,
            name,
            email,
            phone,
            address
          )
        `
        )
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Récupérer les articles de la facture avec les produits
      const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select(
          `
          *,
          products_carreaux (
            id,
            name,
            reference,
            description,
            type_produit
          )
        `
        )
        .eq("invoice_id", invoiceId);

      if (itemsError) throw itemsError;

      return {
        invoice,
        items: invoiceItems || [],
      };
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des détails de la facture:",
        error
      );
      throw error;
    }
  };

  const generatePDF = async (invoiceId: string) => {
    try {
      if (isLoadingUser.value) await loadCurrentUser();
      if (companyId.value) await fetchCompanySettings(companyId.value);
      // Charger les paramètres de l'entreprise
      await fetchCompanySettings();

      // Attendre que companySettings.value soit bien défini (boucle max 10x)
      let companyName = companySettings.value?.company_name;
      let tries = 0;
      while (!companyName && tries < 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        companyName = companySettings.value?.company_name;
        tries++;
      }

      const { invoice, items } = await fetchInvoiceDetails(invoiceId);

      // Créer un nouveau document PDF
      if (!jsPDF) {
        throw new Error(
          "Impossible de générer le PDF : jsPDF n'est pas disponible côté serveur ou l'import a échoué."
        );
      }
      let doc;
      try {
        doc = new jsPDF();
      } catch (err) {
        console.error("Erreur jsPDF:", err);
        throw new Error(
          "Erreur lors de la création du PDF. Veuillez réessayer ou contacter un administrateur."
        );
      }

      // Configuration des couleurs et styles
      const primaryColor: [number, number, number] = [41, 128, 185]; // Bleu
      const grayColor: [number, number, number] = [128, 128, 128];
      const darkColor: [number, number, number] = [34, 34, 34];

      // En-tête bandeau bleu
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 45, "F");

      // Infos facture à gauche (plus bas et en noir)
      doc.setTextColor(34, 34, 34); // Noir
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURE", 15, 55);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Référence : ${invoice.reference || "N/A"}`, 15, 63);
      doc.text(
        `Date : ${new Date(invoice.date).toLocaleDateString("fr-FR")}`,
        15,
        69
      );
      doc.text(
        `Statut : ${invoice.status === "paid" ? "Payée" : "En attente"}`,
        15,
        75
      );

      // Infos société à droite
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(
        (companySettings.value?.company_name || "MON ENTREPRISE").toUpperCase(),
        135,
        14
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        companySettings.value?.company_address || "Adresse non définie",
        135,
        22
      );
      doc.text(`${companySettings.value?.company_email || "N/A"}`, 135, 26);
      doc.text(
        `${companySettings.value?.company_phone || "Téléphone"}`,
        135,
        18
      );

      // Informations client (descendu plus bas, moins d'espace entre les lignes)
      doc.setFillColor(245, 245, 245);
      doc.rect(15, 95, 90, 35, "F");

      doc.setTextColor(...darkColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURÉ À:", 20, 105);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const client = invoice.clients;
      let lineY = 109;
      doc.text(client.name || "Client inconnu", 20, lineY);
      lineY += 4;
      if (client.address) {
        doc.text(client.address, 20, lineY);
        lineY += 4;
      }
      if (client.email) {
        doc.text(`Email: ${client.email}`, 20, lineY);
        lineY += 4;
      }
      if (client.phone) {
        doc.text(`Tél: ${client.phone}`, 20, lineY);
      }

      // Tableau des articles
      const startY = 135; // plus bas
      const tableHeaders = [
        "Description",
        "Réf.",
        "Qté",
        "Prix unit.",
        "Total",
      ];
      const colWidths = [70, 30, 20, 25, 25];
      let currentY = startY;

      // En-tête du tableau
      doc.setFillColor(...primaryColor);
      doc.rect(15, currentY, 170, 10, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      let currentX = 20;
      tableHeaders.forEach((header, index) => {
        doc.text(header, currentX, currentY + 7);
        currentX += colWidths[index] ?? 40;
      });

      currentY += 10;
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "normal");

      // Lignes du tableau
      let subtotal = 0;
      items.forEach((item: InvoiceItem, index) => {
        const product = item.products_carreaux;
        const total = item.quantity * item.price;
        subtotal += total;

        // Ligne alternée
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, currentY, 170, 8, "F");
        }

        currentX = 20;
        // Gérer les produits internes et externes
        const productName = item.is_external
          ? item.external_description || "Produit externe"
          : product?.name || "Produit inconnu";
        const productRef = item.is_external
          ? item.external_reference || "N/A"
          : product?.reference || "N/A";

        const rowData = [
          productName,
          productRef,
          item.quantity.toString(),
          `${item.price.toFixed(2)} ${companySettings.value?.currency}`,
          `${total.toFixed(2)} ${companySettings.value?.currency}`,
        ];

        rowData.forEach((data, colIndex) => {
          if (colIndex === 0) {
            // Couper le texte si trop long
            const maxWidth = (colWidths[colIndex] || 40) - 5;
            const text = doc.splitTextToSize(data, maxWidth);
            doc.text(text[0] || data, currentX, currentY + 6);
          } else {
            doc.text(data, currentX, currentY + 6);
          }
          currentX += colWidths[colIndex] || 40;
        });

        currentY += 8;
      });

      // Ligne de séparation
      doc.setDrawColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.line(15, currentY + 5, 185, currentY + 5);

      // Totaux
      currentY += 15;
      const totalX = 135;

      doc.setFont("helvetica", "normal");
      doc.text("Sous-total HT:", totalX, currentY);
      doc.text(
        `${subtotal.toFixed(2)} ${companySettings.value?.currency}`,
        totalX + 35,
        currentY
      );

      currentY += 8;
      doc.text(
        `TVA (${companySettings.value?.tax_rate || 20}%):`,
        totalX,
        currentY
      );
      const tva = subtotal * ((companySettings.value?.tax_rate || 20) / 100);
      doc.text(
        `${tva.toFixed(2)} ${companySettings.value?.currency}`,
        totalX + 35,
        currentY
      );

      currentY += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL TTC:", totalX, currentY);
      doc.text(
        `${invoice.total.toFixed(2)} ${companySettings.value?.currency}`,
        totalX + 35,
        currentY
      );

      // Pied de page
      currentY = 270;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text("Merci de votre confiance !", 15, currentY);
      doc.text(
        `Facture générée le ${new Date().toLocaleDateString("fr-FR")}`,
        15,
        currentY + 5
      );

      // Conditions de paiement
      doc.text("Conditions de paiement: 30 jours net", 15, currentY + 10);
      if (companySettings.value?.company_siret) {
        doc.text(
          `SIRET: ${companySettings.value.company_siret}`,
          15,
          currentY + 15
        );
      }

      return doc;
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      throw error;
    }
  };

  const downloadPDF = async (invoiceId: string) => {
    try {
      const doc = await generatePDF(invoiceId);

      // Télécharger le PDF
      const { data: invoice } = await supabase
        .from("invoices")
        .select("reference, date")
        .eq("id", invoiceId)
        .single();

      const invoiceData = invoice as {
        reference?: string;
        date?: string;
      } | null;

      const fileName = `Facture_${invoiceData?.reference || invoiceId}_${
        new Date(invoiceData?.date || new Date()).toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Erreur lors du téléchargement du PDF:", error);
      throw error;
    }
  };

  const printPDF = async (invoiceId: string) => {
    try {
      const doc = await generatePDF(invoiceId);

      // Ouvrir le PDF dans une nouvelle fenêtre pour impression
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);

      // Ouvrir dans une nouvelle fenêtre et déclencher l'impression
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = function () {
          printWindow.focus();
          printWindow.print();
        };
      }
    } catch (error) {
      console.error("Erreur lors de l'impression du PDF:", error);
      throw error;
    }
  };

  const generatePartialPDF = async (invoiceId: string) => {
    try {
      if (isLoadingUser.value) await loadCurrentUser();
      if (companyId.value) await fetchCompanySettings(companyId.value);
      // Charger les paramètres de l'entreprise
      await fetchCompanySettings();

      const { invoice, items } = await fetchInvoiceDetails(invoiceId);

      // Récupérer les paiements de la facture
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: true });

      if (paymentsError) throw paymentsError;

      // Créer un nouveau document PDF
      if (!jsPDF) {
        throw new Error(
          "Impossible de générer le PDF : jsPDF n'est pas disponible côté serveur ou l'import a échoué."
        );
      }
      let doc;
      try {
        doc = new jsPDF();
      } catch (err) {
        console.error("Erreur jsPDF:", err);
        throw new Error(
          "Erreur lors de la création du PDF. Veuillez réessayer ou contacter un administrateur."
        );
      }

      // Configuration des couleurs et styles
      const primaryColor: [number, number, number] = [41, 128, 185]; // Bleu
      const grayColor: [number, number, number] = [128, 128, 128];
      const darkColor: [number, number, number] = [34, 34, 34];
      const greenColor: [number, number, number] = [46, 204, 113];
      const orangeColor: [number, number, number] = [230, 126, 34];

      // En-tête de l'entreprise
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 35, "F");

      // Infos société à droite, remonté un peu, moins d'espace, texte en blanc, encore plus à droite
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(
        (companySettings.value?.company_name || "MON ENTREPRISE").toUpperCase(),
        135,
        14
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        companySettings.value?.company_address || "Adresse non définie",
        135,
        22
      );
      doc.text(`${companySettings.value?.company_email || "N/A"}`, 135, 26);
      doc.text(
        `${companySettings.value?.company_phone || "Téléphone"}`,
        135,
        18
      );

      // Titre facture avec détail paiements (aligné à gauche)
      doc.setTextColor(...darkColor);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURE - DÉTAIL", 15, 45);

      // Numéro et date de facture
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Référence: ${invoice.reference || "N/A"}`, 15, 53);
      doc.text(
        `Date: ${new Date(invoice.date).toLocaleDateString("fr-FR")}`,
        15,
        59
      );

      // Informations client (encore plus bas, moins d'espace entre les lignes)
      doc.setFillColor(245, 245, 245);
      doc.rect(15, 75, 90, 35, "F");

      doc.setTextColor(...darkColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURÉ À:", 20, 85);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const client = invoice.clients;
      let lineY = 90;
      doc.text(client?.name || "Client inconnu", 20, lineY);
      lineY += 5;
      if (client?.address) {
        doc.text(client.address, 20, lineY);
        lineY += 5;
      }
      if (client?.email) {
        doc.text(`${client.email}`, 20, lineY);
        lineY += 5;
      }
      if (client?.phone) {
        doc.text(`${client.phone}`, 20, lineY);
      }

      // Résumé des montants
      const totalInvoice = invoice.total;
      const totalPaid =
        payments?.reduce(
          (sum: number, payment: Payment) => sum + (payment.amount || 0),
          0
        ) || 0;
      const remaining = totalInvoice - totalPaid;

      doc.setFillColor(240, 248, 255);
      doc.rect(110, 75, 75, 35, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("RÉSUMÉ PAIEMENTS:", 115, 85);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `Total facture: ${totalInvoice.toFixed(2)} ${
          companySettings.value?.currency
        }`,
        115,
        93
      );

      doc.setTextColor(...greenColor);
      doc.text(
        `Montant payé: ${totalPaid.toFixed(2)} ${
          companySettings.value?.currency
        }`,
        115,
        98
      );

      doc.setTextColor(
        remaining > 0 ? orangeColor[0] : greenColor[0],
        remaining > 0 ? orangeColor[1] : greenColor[1],
        remaining > 0 ? orangeColor[2] : greenColor[2]
      );
      doc.text(
        `Reste à payer: ${remaining.toFixed(2)} ${
          companySettings.value?.currency
        }`,
        115,
        103
      );

      doc.setTextColor(...darkColor);
      doc.text(
        `Statut: ${remaining <= 0 ? "Soldée" : "Partiellement payée"}`,
        115,
        108
      );

      // Tableau des articles (version condensée)
      let currentY = 125;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DÉTAIL DES ARTICLES", 15, currentY);
      currentY += 10;

      const tableHeaders = ["Description", "Qté", "Prix unit.", "Total"];
      const colWidths = [90, 20, 25, 25];

      // En-tête du tableau
      doc.setFillColor(...primaryColor);
      doc.rect(15, currentY, 160, 10, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      let currentX = 20;
      tableHeaders.forEach((header, index) => {
        doc.text(header, currentX, currentY + 7);
        currentX += colWidths[index] ?? 40;
      });

      currentY += 10;
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "normal");

      // Lignes du tableau (condensées)
      items.forEach((item: InvoiceItem, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, currentY, 160, 8, "F");
        }

        const product = item.products_carreaux;
        const total = item.quantity * item.price;

        currentX = 20;
        const productName = item.is_external
          ? item.external_description || "Produit externe"
          : product?.name || "Produit inconnu";

        const rowData = [
          productName.length > 35
            ? productName.substring(0, 35) + "..."
            : productName,
          item.quantity.toString(),
          `${item.price.toFixed(2)} ${companySettings.value?.currency}`,
          `${total.toFixed(2)} ${companySettings.value?.currency}`,
        ];

        rowData.forEach((data, colIndex) => {
          doc.text(data, currentX, currentY + 6);
          currentX += colWidths[colIndex] ?? 40;
        });

        currentY += 8;
      });

      // Section des paiements
      currentY += 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("HISTORIQUE DES PAIEMENTS", 15, currentY);
      currentY += 10;

      if (payments && payments.length > 0) {
        // En-tête tableau paiements
        const paymentHeaders = ["Date", "Méthode", "Montant", "Référence"];
        const paymentColWidths = [40, 40, 30, 50];

        doc.setFillColor(...greenColor);
        doc.rect(15, currentY, 160, 10, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);

        currentX = 20;
        paymentHeaders.forEach((header, index) => {
          doc.text(header, currentX, currentY + 7);
          currentX += paymentColWidths[index] ?? 40;
        });

        currentY += 10;
        doc.setTextColor(...darkColor);
        doc.setFont("helvetica", "normal");

        // Lignes des paiements
        payments.forEach((payment: Payment, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(248, 255, 248);
            doc.rect(15, currentY, 160, 8, "F");
          }

          currentX = 20;
          const paymentData = [
            new Date(payment.payment_date).toLocaleDateString("fr-FR"),
            payment.payment_method || "N/A",
            `${payment.amount.toFixed(2)} ${companySettings.value?.currency}`,
            payment.reference || "N/A",
          ];

          paymentData.forEach((data, colIndex) => {
            const text =
              data.length > 15 ? data.substring(0, 15) + "..." : data;
            doc.text(text, currentX, currentY + 6);
            currentX += paymentColWidths[colIndex] ?? 40;
          });

          currentY += 8;
        });
      } else {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...grayColor);
        doc.text("Aucun paiement enregistré", 15, currentY + 10);
        currentY += 20;
      }

      // Récapitulatif final
      currentY += 15;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, currentY, 170, 25, "F");

      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("RÉCAPITULATIF", 20, currentY + 10);

      const summaryY = currentY + 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `Total facture: ${totalInvoice.toFixed(2)} ${
          companySettings.value?.currency
        }`,
        20,
        summaryY
      );

      doc.setTextColor(...greenColor);
      doc.text(
        `Total payé: ${totalPaid.toFixed(2)} ${
          companySettings.value?.currency
        }`,
        75,
        summaryY
      );

      doc.setTextColor(
        remaining > 0 ? orangeColor[0] : greenColor[0],
        remaining > 0 ? orangeColor[1] : greenColor[1],
        remaining > 0 ? orangeColor[2] : greenColor[2]
      );
      doc.text(
        `Reste dû: ${remaining.toFixed(2)} ${companySettings.value?.currency}`,
        130,
        summaryY
      );

      // Pied de page
      const footerY = 270;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text("Document généré avec détail des paiements", 15, footerY);
      doc.text(
        `Généré le ${new Date().toLocaleDateString(
          "fr-FR"
        )} à ${new Date().toLocaleTimeString("fr-FR")}`,
        15,
        footerY + 5
      );

      return doc;
    } catch (error) {
      console.error("Erreur lors de la génération du PDF partiel:", error);
      throw error;
    }
  };

  const downloadPartialPDF = async (invoiceId: string) => {
    try {
      const doc = await generatePartialPDF(invoiceId);

      // Télécharger le PDF
      const { data: invoice } = await supabase
        .from("invoices")
        .select("reference, date")
        .eq("id", invoiceId)
        .single();

      const invoiceData = invoice as {
        reference?: string;
        date?: string;
      } | null;

      const fileName = `Facture_Paiements_${
        invoiceData?.reference || invoiceId
      }_${
        new Date(invoiceData?.date || new Date()).toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Erreur lors du téléchargement du PDF partiel:", error);
      throw error;
    }
  };

  const printPartialPDF = async (invoiceId: string) => {
    try {
      const doc = await generatePartialPDF(invoiceId);

      // Ouvrir le PDF dans une nouvelle fenêtre pour impression
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);

      // Ouvrir dans une nouvelle fenêtre et déclencher l'impression
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = function () {
          printWindow.focus();
          printWindow.print();
        };
      }
    } catch (error) {
      console.error("Erreur lors de l'impression du PDF partiel:", error);
      throw error;
    }
  };

  return {
    generatePDF,
    downloadPDF,
    printPDF,
    generatePartialPDF,
    downloadPartialPDF,
    printPartialPDF,
    fetchInvoiceDetails,
  };
};
function fetchInvoiceDetails() {
  throw new Error("Function not implemented.");
}
