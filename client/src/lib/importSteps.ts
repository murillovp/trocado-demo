import type { UploadStep } from '@/api/upload';

/** What the import is doing right now, in one line (spec 1). */
export function stepText(step: UploadStep, isSwile: boolean): string {
  switch (step.step) {
    case 'upload':
      return `${isSwile ? 'Enviando as capturas' : 'Enviando o arquivo'}… ${step.percent}%`;
    case 'waiting':
      return 'Esperando o servidor…';
    case 'reading':
      return 'Lendo as linhas do arquivo';
    case 'reading_image':
      return `Lendo a captura ${step.index} de ${step.total} com a IA`;
    case 'checking':
      return 'Procurando linhas repetidas e transferências';
    case 'asking_ai':
      return step.count === 1
        ? 'Pedindo à IA nome e categoria de 1 fornecedor'
        : `Pedindo à IA nomes e categorias de ${step.count} fornecedores`;
    case 'saving':
      return 'Salvando';
  }
}
