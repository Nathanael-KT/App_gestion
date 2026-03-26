import { jsPDF } from "jspdf";
import { useCurrentUser } from "./useCurrentUser";
import { useCompanySettings } from "./useCompanySettings";

// La récupération des paramètres société se fait dans generateDeliveryNote

// Types pour TypeScript
interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  reference?: string | null;
  description?: string | null;
  type_produit?: string | null;
  nbr_pieces?: number | null;
  longueur?: number | null;
  largeur?: number | null;
}

interface InvoiceItem {
  id: string;
  quantity: number;
  price: number;
  product_id?: string;
  products_carreaux?: Product;
  // Nouveaux champs pour les produits externes
  is_external?: boolean;
  external_reference?: string;
  external_description?: string;
}

interface Invoice {
  id: string;
  reference?: string;
  date: string;
  total: number;
  status: string;
  delivery?: boolean;
  is_external?: boolean; // Nouveau champ pour indiquer si la facture contient des produits externes
  clients: Client;
}

export const useDeliveryNoteGenerator = () => {
  const supabase = useSupabaseClient();

  // Utilisation du composable pour les paramètres de l'entreprise
  const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
  const { settings: companySettings, fetchCompanySettings } =
    useCompanySettings();

  const fetchOrderDetails = async (invoiceId: string) => {
    try {
      // Étape 1: Récupérer les détails de la commande avec le client
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
        `,
        )
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Étape 2: Récupérer SÉPARÉMENT les articles sans jointe problématique
      const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select(
          `
          id,
          invoice_id,
          product_id,
          quantity,
          price,
          is_external,
          external_reference,
          external_description
        `,
        )
        .eq("invoice_id", invoiceId);

      if (itemsError) throw itemsError;

      // Étape 3: Charger les produits si nécessaire
      const typedItems = (invoiceItems || []) as InvoiceItem[];
      const productIds = typedItems
        .filter((item: InvoiceItem) => item.product_id && !item.is_external)
        .map((item: InvoiceItem) => item.product_id as string);

      const productsMap: Record<string, Product> = {};
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from("products_carreaux")
          .select(
            `
            id,
            name,
            reference,
            description,
            type_produit,
            nbr_pieces,
            longueur,
            largeur
            `,
          )
          .in("id", productIds);

        (productsData || []).forEach((product: Product) => {
          productsMap[product.id] = product;
        });
      }

      // Enrichir les articles
      const enrichedItems = typedItems.map((item: InvoiceItem) => ({
        ...item,
        products_carreaux: item.product_id
          ? productsMap[item.product_id] || null
          : null,
      }));

      return {
        invoice: invoice as Invoice,
        items: enrichedItems as InvoiceItem[],
      };
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des détails de la commande:",
        error,
      );
      throw error;
    }
  };

  const calculateCartons = (product: Product, quantity: number) => {
    const stock = parseFloat(quantity.toString());
    const nbr_pieces = parseFloat(product?.nbr_pieces?.toString() || "0");
    const longueur = parseFloat(product?.longueur?.toString() || "0");
    const largeur = parseFloat(product?.largeur?.toString() || "0");

    if (!nbr_pieces || !longueur || !largeur) return { cartons: 0, pieces: 0 };

    const conditionnement_calculer = longueur * largeur * nbr_pieces;
    const totalCartons = Math.floor(stock / conditionnement_calculer);

    // Calcul des pièces restantes - utilise exactement la même logique que CartonCalculator
    const conditionnement_calculer_precise = parseFloat(
      (longueur * largeur * nbr_pieces).toFixed(3),
    );

    if (nbr_pieces <= 0) {
      return { cartons: totalCartons, pieces: 0 };
    }

    const remainingStock =
      stock -
      Math.floor(stock / conditionnement_calculer_precise) *
      conditionnement_calculer_precise;
    const decimalPart = remainingStock / conditionnement_calculer_precise;
    const remainingPieces = Math.floor(decimalPart * nbr_pieces);

    return {
      cartons: totalCartons,
      pieces: remainingPieces,
    };
  };

  const generateDeliveryNote = async (invoiceId: string) => {
    try {
      if (isLoadingUser.value) await loadCurrentUser();
      if (companyId.value) await fetchCompanySettings(companyId.value);
      const { invoice, items } = await fetchOrderDetails(invoiceId);

      // Créer un nouveau document PDF en format A4 avec deux bons identiques
      const doc = new jsPDF();

      // Configuration des couleurs et styles
      const primaryColor: [number, number, number] = [34, 139, 34]; // Vert pour les bons de livraison
      const grayColor: [number, number, number] = [128, 128, 128];
      const darkColor: [number, number, number] = [34, 34, 34];

      // Fonction pour créer un bon de livraison
      const createDeliverySlip = (startY: number, title: string) => {
        let currentY = startY;

        // En-tête du bon
        doc.setFillColor(...primaryColor);
        doc.rect(0, currentY, 210, 15, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("BON DE LIVRAISON", 15, currentY + 10);
        doc.text(`(${title})`, 120, currentY + 10);

        // Informations entreprise (petite taille, à gauche)
        doc.setTextColor(...darkColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(
          companySettings.value?.company_name || "MON ENTREPRISE",
          15,
          currentY + 22,
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text(
          companySettings.value?.company_address || "Adresse non définie",
          15,
          currentY + 27,
        );
        doc.text(
          `Tél: ${companySettings.value?.company_phone || "N/A"}`,
          15,
          currentY + 32,
        );

        // Numéro de bon et date (petite taille, à droite)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text(`Ref: ${invoice.reference || "N/A"}`, 140, currentY + 25);
        doc.text(
          `Date: ${new Date(invoice.date).toLocaleDateString("fr-FR")}`,
          140,
          currentY + 30,
        );

        // Informations client
        doc.setFillColor(240, 240, 240);
        doc.rect(15, currentY + 35, 180, 20, "F");

        doc.setTextColor(...darkColor);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("À RETIRER PAR :", 20, currentY + 43);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        const client = invoice.clients;
        doc.text(client.name || "Client inconnu", 20, currentY + 48);
        if (client.address) doc.text(client.address, 20, currentY + 52);
        if (client.phone) doc.text(`Tél: ${client.phone}`, 120, currentY + 48);
        if (client.email)
          doc.text(`Email: ${client.email}`, 120, currentY + 52);

        currentY += 60;

        // Tableau des articles (très compact)
        const tableHeaders = ["Article", "Réf.", "Qté", "Cartons", "Pièces"];
        const colWidths = [45, 20, 20, 20, 20];

        // En-tête du tableau
        doc.setFillColor(...primaryColor);
        doc.rect(15, currentY, 125, 6, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);

        let currentX = 17;
        tableHeaders.forEach((header, index) => {
          doc.text(header, currentX, currentY + 4);
          currentX += colWidths[index] || 0;
        });

        currentY += 6;
        doc.setTextColor(...darkColor);
        doc.setFont("helvetica", "normal");

        // Lignes du tableau (très compact)
        items.slice(0, 4).forEach((item: InvoiceItem, index: number) => {
          // Limiter à 4 items pour l'espace
          const product = item.products_carreaux;

          // Calcul des cartons (uniquement pour les produits internes avec dimensions)
          let cartons = 0;
          let pieces = 0;

          if (
            !item.is_external &&
            product?.longueur &&
            product?.largeur &&
            product?.nbr_pieces
          ) {
            const calculation = calculateCartons(product, item.quantity);
            cartons = calculation.cartons;
            pieces = calculation.pieces;
          }

          // Ligne alternée
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(15, currentY, 125, 5, "F");
          }

          currentX = 17;

          // Gérer les produits internes et externes
          const productName = item.is_external
            ? (item.external_description || "Produit externe").substring(0, 15)
            : (product?.name || "Produit").substring(0, 15);
          const productRef = item.is_external
            ? item.external_reference || "EXT"
            : product?.reference || "N/A";

          const rowData = [
            productName,
            productRef,
            item.quantity.toString() + (item.is_external ? "" : "m²"),
            item.is_external ? "-" : cartons.toString(),
            item.is_external ? "-" : pieces.toString(),
          ];

          rowData.forEach((data, colIndex) => {
            doc.setFontSize(6);
            doc.text(data, currentX, currentY + 3.5);
            currentX += colWidths[colIndex] || 0;
          });

          currentY += 5;
        });

        // Si plus de 4 items, indiquer le nombre total
        if (items.length > 4) {
          doc.setFontSize(6);
          doc.setFont("helvetica", "italic");
          doc.text(
            `... et ${items.length - 4} autre(s) article(s)`,
            17,
            currentY + 3,
          );
          currentY += 5;
        }

        currentY += 5;

        // Instructions de retrait (compact)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("INSTRUCTIONS :", 15, currentY);

        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text("• Présentez ce bon à l'accueil", 17, currentY);
        currentY += 3;
        doc.text("• Vérifiez les quantités", 17, currentY);
        currentY += 3;
        doc.text("• Signez après vérification", 17, currentY);

        currentY += 8;

        // Signatures (compact)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.text("Signature client :", 15, currentY);
        doc.rect(15, currentY + 2, 40, 10, "S");

        doc.text("Signature magasinier :", 100, currentY);
        doc.rect(100, currentY + 2, 40, 10, "S");

        currentY += 15;

        // Total et date de génération
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...grayColor);
        doc.text(
          `Total: ${invoice.total.toFixed(2)}${companySettings.value?.currency} TTC`,
          15,
          currentY,
        );
        doc.text(
          `Généré le ${new Date().toLocaleDateString(
            "fr-FR",
          )} à ${new Date().toLocaleTimeString("fr-FR")}`,
          100,
          currentY,
        );

        return currentY + 5;
      };

      // Créer le premier bon (EXEMPLAIRE CLIENT)
      createDeliverySlip(5, "EXEMPLAIRE CLIENT");

      // Ligne de séparation pointillée
      doc.setDrawColor(...grayColor);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(10, 148, 200, 148);
      doc.setLineDashPattern([], 0); // Retour à ligne continue

      // Texte de séparation
      doc.setTextColor(...grayColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("✂️ DÉCOUPER ICI ✂️", 85, 146);

      // Créer le deuxième bon (EXEMPLAIRE MAGASINIER)
      createDeliverySlip(152, "EXEMPLAIRE MAGASIN");

      return doc;
    } catch (error) {
      console.error("Erreur lors de la génération du bon de livraison:", error);
      throw error;
    }
  };

  const downloadDeliveryNote = async (invoiceId: string) => {
    try {
      const doc = await generateDeliveryNote(invoiceId);

      // Télécharger le PDF
      const { data: invoice } = await supabase
        .from("invoices")
        .select("reference, date")
        .eq("id", invoiceId)
        .single();

      const invoiceData = invoice as unknown as Pick<
        Invoice,
        "reference" | "date"
      > | null;

      const fileName = `Bon_Livraison_${invoiceData?.reference || invoiceId}_${invoiceData?.date
          ? new Date(invoiceData.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
        }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error(
        "Erreur lors du téléchargement du bon de livraison:",
        error,
      );
      throw error;
    }
  };

  const printDeliveryNote = async (invoiceId: string) => {
    try {
      const doc = await generateDeliveryNote(invoiceId);

      // Ouvrir le PDF dans une nouvelle fenêtre pour impression
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);

      // Ouvrir dans une nouvelle fenêtre et déclencher l'impression
      const openWindow = (
        globalThis as unknown as {
          open?: (url?: string, target?: string) => Window | null;
        }
      ).open;
      const printWindow =
        typeof openWindow === "function" ? openWindow(url, "_blank") : null;
      if (printWindow) {
        const safeWindow = printWindow as unknown as {
          onload: null | (() => void);
          focus?: () => void;
          print?: () => void;
        };
        safeWindow.onload = function () {
          safeWindow.focus?.();
          safeWindow.print?.();
        };
      }
    } catch (error) {
      console.error("Erreur lors de l'impression du bon de livraison:", error);
      throw error;
    }
  };

  return {
    generateDeliveryNote,
    downloadDeliveryNote,
    printDeliveryNote,
    fetchOrderDetails,
  };
};
