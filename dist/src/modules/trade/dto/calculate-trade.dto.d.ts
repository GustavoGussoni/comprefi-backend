export declare class CalculateTradeDto {
    modeloAtual: string;
    capacidadeAtual: string;
    corAtual: string;
    bateriaAtual: number;
    valorManual?: number;
    defeitos?: string[];
    pecasTrocadas?: boolean;
    quaisPecas?: string;
    modeloDesejado: string;
    ondeOuviu?: string;
    tempoPensando?: string;
    urgenciaTroca?: string;
}
export declare class TradeResultDto {
    valorBase: number;
    depreciacaoBateria: number;
    depreciacaoDefeitos: number;
    valorAparelho: number;
    precoProduto: string | number;
    valorFinal: number;
    valorComDesconto: number;
    produtoDesejado: any;
    temDefeito: boolean;
    precisaCotacao: boolean;
    cupomDesconto: string;
    resumoDetalhado: string;
}
