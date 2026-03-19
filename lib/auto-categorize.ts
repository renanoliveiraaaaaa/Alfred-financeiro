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

  // Manutenção carro
  ['oficina', 'manutencao_carro'],
  ['autocentro', 'manutencao_carro'],
  ['borracharia', 'manutencao_carro'],
  ['troca de oleo', 'manutencao_carro'],
  ['revisao', 'manutencao_carro'],
  ['pecas auto', 'manutencao_carro'],
  ['mecanica', 'manutencao_carro'],

  // Mercado
  ['supermercado', 'mercado'],
  ['hipermercado', 'mercado'],
  ['atacadao', 'mercado'],
  ['assai', 'mercado'],
  ['carrefour', 'mercado'],
  ['pao de acucar', 'mercado'],
  ['extra', 'mercado'],
  ['walmart', 'mercado'],
  ['sams club', 'mercado'],
  ['makro', 'mercado'],

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
  ['droga raia', 'saude'],
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
