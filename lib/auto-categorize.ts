/**
 * Auto-categorização de transações importadas de extratos bancários.
 *
 * Mapeia palavras-chave (case-insensitive, sem acentos) para as categorias
 * existentes no sistema Alfred Financeiro.
 */

const KEYWORD_MAP: Array<[string, string]> = [
  // Alimentação
  ['ifood', 'alimentacao'],
  ['rappi', 'alimentacao'],
  ['restaurante', 'alimentacao'],
  ['lanchonete', 'alimentacao'],
  ['padaria', 'alimentacao'],
  ['panificadora', 'alimentacao'],
  ['pizzaria', 'alimentacao'],
  ['hamburguer', 'alimentacao'],
  ['hamburgueria', 'alimentacao'],
  ['sushi', 'alimentacao'],
  ['churrascaria', 'alimentacao'],
  ['acougue', 'alimentacao'],
  ['hortifruti', 'alimentacao'],
  ['sorveteria', 'alimentacao'],
  ['cafeteria', 'alimentacao'],
  ['cafe ', 'alimentacao'],

  // Fatura de cartão de crédito (pagamento da fatura saindo da conta corrente)
  ['pgto cartao', 'fatura_cartao'],
  ['pagto cartao', 'fatura_cartao'],
  ['pagamento cartao', 'fatura_cartao'],
  ['pagamento fatura', 'fatura_cartao'],
  ['fatura cartao', 'fatura_cartao'],
  ['fatura nubank', 'fatura_cartao'],
  ['fatura itau', 'fatura_cartao'],
  ['fatura bradesco', 'fatura_cartao'],
  ['fatura santander', 'fatura_cartao'],
  ['fatura inter', 'fatura_cartao'],
  ['fatura c6', 'fatura_cartao'],
  ['fatura bb', 'fatura_cartao'],
  ['fatura caixa', 'fatura_cartao'],
  ['fatura xp', 'fatura_cartao'],
  ['fatura next', 'fatura_cartao'],
  ['fatura neon', 'fatura_cartao'],
  ['fatura will bank', 'fatura_cartao'],
  ['credito rotativo', 'fatura_cartao'],
  ['pagamento de fatura', 'fatura_cartao'],
  ['deb fatura', 'fatura_cartao'],

  // Compras online / Marketplaces
  ['mercado livre', 'compras'],
  ['mercadolivre', 'compras'],
  ['mercadopago', 'compras'],
  ['shopee', 'compras'],
  ['shein', 'compras'],
  ['aliexpress', 'compras'],
  ['amazon', 'compras'],
  ['magalu', 'compras'],
  ['magazine luiza', 'compras'],
  ['americanas', 'compras'],
  ['submarino', 'compras'],
  ['shoptime', 'compras'],
  ['casas bahia', 'compras'],
  ['ponto frio', 'compras'],
  ['extra.com', 'compras'],
  ['netshoes', 'compras'],
  ['zattini', 'compras'],
  ['centauro', 'compras'],
  ['kabum', 'compras'],
  ['fast shop', 'compras'],
  ['leroy merlin', 'compras'],
  ['c&a', 'compras'],
  ['renner', 'compras'],
  ['riachuelo', 'compras'],
  ['hering', 'compras'],
  ['adidas', 'compras'],
  ['nike', 'compras'],
  ['decathlon', 'compras'],
  ['droga raia', 'compras'],
  ['ebay', 'compras'],

  // Transporte
  ['uber', 'transporte'],
  ['99app', 'transporte'],
  ['cabify', 'transporte'],
  ['onibus', 'transporte'],
  ['metro', 'transporte'],
  ['bilhete unico', 'transporte'],
  ['transporte', 'transporte'],
  ['taxi', 'transporte'],
  ['aeroporto', 'transporte'],
  ['passagem', 'transporte'],
  ['buser', 'transporte'],
  ['clickbus', 'transporte'],

  // Combustível
  ['posto ', 'combustivel'],
  ['shell', 'combustivel'],
  ['ipiranga', 'combustivel'],
  ['br distribuidora', 'combustivel'],
  ['petrobras', 'combustivel'],
  ['ale combustiveis', 'combustivel'],
  ['gasolina', 'combustivel'],
  ['etanol', 'combustivel'],
  ['diesel', 'combustivel'],

  // Veículo (manutenção, seguro, consórcio, IPVA, etc.)
  ['oficina', 'veiculo'],
  ['autocentro', 'veiculo'],
  ['borracharia', 'veiculo'],
  ['troca de oleo', 'veiculo'],
  ['revisao veiculo', 'veiculo'],
  ['pecas auto', 'veiculo'],
  ['mecanica', 'veiculo'],
  ['seguro auto', 'veiculo'],
  ['seguro veiculo', 'veiculo'],
  ['seguro carro', 'veiculo'],
  ['porto seguro auto', 'veiculo'],
  ['mapfre auto', 'veiculo'],
  ['tokio marine auto', 'veiculo'],
  ['azul seguros auto', 'veiculo'],
  ['consorcio auto', 'veiculo'],
  ['consorcio veiculo', 'veiculo'],
  ['financiamento veiculo', 'veiculo'],
  ['financiamento carro', 'veiculo'],
  ['ipva', 'veiculo'],
  ['licenciamento', 'veiculo'],
  ['dpvat', 'veiculo'],
  ['detran', 'veiculo'],
  ['multa transito', 'veiculo'],
  ['estacionamento', 'veiculo'],
  ['pedagio', 'veiculo'],
  ['sem parar', 'veiculo'],
  ['veloe', 'veiculo'],
  ['conectcar', 'veiculo'],

  // Mercado (supermercados físicos — após "mercado livre" para não conflitar)
  ['supermercado', 'mercado'],
  ['hipermercado', 'mercado'],
  ['atacadao', 'mercado'],
  ['assai', 'mercado'],
  ['carrefour', 'mercado'],
  ['pao de acucar', 'mercado'],
  ['walmart', 'mercado'],
  ['sams club', 'mercado'],
  ['makro', 'mercado'],
  ['dia supermercado', 'mercado'],
  ['prezunic', 'mercado'],
  ['supernosso', 'mercado'],

  // Assinaturas
  ['netflix', 'assinaturas'],
  ['spotify', 'assinaturas'],
  ['amazon prime', 'assinaturas'],
  ['disney', 'assinaturas'],
  ['hbo', 'assinaturas'],
  ['youtube premium', 'assinaturas'],
  ['apple', 'assinaturas'],
  ['globoplay', 'assinaturas'],
  ['paramount', 'assinaturas'],
  ['twitch', 'assinaturas'],
  ['deezer', 'assinaturas'],
  ['crunchyroll', 'assinaturas'],
  ['max.com', 'assinaturas'],

  // Moradia
  ['energia', 'moradia'],
  ['luz ', 'moradia'],
  ['enel', 'moradia'],
  ['cemig', 'moradia'],
  ['cpfl', 'moradia'],
  ['coelce', 'moradia'],
  ['copasa', 'moradia'],
  ['sabesp', 'moradia'],
  ['sanepar', 'moradia'],
  ['agua ', 'moradia'],
  ['aluguel', 'moradia'],
  ['condominio', 'moradia'],
  ['iptu', 'moradia'],
  ['seguro residencial', 'moradia'],
  ['gas ', 'moradia'],

  // Saúde
  ['farmacia', 'saude'],
  ['drogaria', 'saude'],
  ['drogasil', 'saude'],
  ['ultrafarma', 'saude'],
  ['unimed', 'saude'],
  ['hapvida', 'saude'],
  ['amil', 'saude'],
  ['bradesco saude', 'saude'],
  ['plano de saude', 'saude'],
  ['hospital', 'saude'],
  ['clinica', 'saude'],
  ['laboratorio', 'saude'],
  ['medico', 'saude'],
  ['odonto', 'saude'],
  ['dentista', 'saude'],
  ['psicolog', 'saude'],
  ['academia', 'saude'],
  ['smart fit', 'saude'],

  // Educação
  ['udemy', 'educacao'],
  ['coursera', 'educacao'],
  ['alura', 'educacao'],
  ['escola', 'educacao'],
  ['faculdade', 'educacao'],
  ['universidade', 'educacao'],
  ['colegio', 'educacao'],
  ['curso', 'educacao'],
  ['mensalidade escolar', 'educacao'],
  ['material escolar', 'educacao'],
  ['livro', 'educacao'],
  ['rocketseat', 'educacao'],
  ['dio.me', 'educacao'],

  // Lazer
  ['cinema', 'lazer'],
  ['ingresso', 'lazer'],
  ['parque', 'lazer'],
  ['teatro', 'lazer'],
  ['show ', 'lazer'],
  ['steam', 'lazer'],
  ['playstation', 'lazer'],
  ['xbox', 'lazer'],
  ['viagem', 'lazer'],
  ['hotel', 'lazer'],
  ['pousada', 'lazer'],
  ['airbnb', 'lazer'],
  ['booking', 'lazer'],
  ['ticketmaster', 'lazer'],
  ['eventim', 'lazer'],
]

/**
 * Remove acentos e converte para minúsculas para comparação normalizada.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Sugere uma categoria baseada na descrição da transação.
 * Retorna 'outros' se nenhuma keyword bater.
 */
export function suggestCategory(description: string): string {
  const normalized = normalize(description)

  for (const [keyword, category] of KEYWORD_MAP) {
    if (normalized.includes(normalize(keyword))) {
      return category
    }
  }

  return 'outros'
}
