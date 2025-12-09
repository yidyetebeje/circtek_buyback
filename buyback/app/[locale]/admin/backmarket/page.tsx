import { BackMarketClient } from "../../../../components/admin/backmarket/BackMarketClient";

/*
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'BackMarket' });
  return {
    title: t('title') || 'Back Market Integration',
  };
}
*/

export default function BackMarketPage() {
  return <BackMarketClient />;
}
