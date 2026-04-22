// Utilitário de Cálculo de Frete por Prefixo de CEP
export const Shipping = {
    // Tabela de frete baseada nos 3 primeiros dígitos do CEP
    rates: {
        '010': { price: 18.00, days: 3 }, '011': { price: 16.00, days: 4 }, '012': { price: 16.00, days: 4 },
        '013': { price: 20.00, days: 5 }, '014': { price: 22.00, days: 5 }, '015': { price: 18.00, days: 4 },

        '020': { price: 12.00, days: 4 }, '021': { price: 12.00, days: 4 }, '022': { price: 10.00, days: 3 },
        '023': { price: 13.00, days: 4 }, '024': { price: 14.00, days: 5 }, '025': { price: 15.00, days: 5 },
        '026': { price: 16.00, days: 6 }, '027': { price: 18.00, days: 6 },

        '030': { price: 24.00, days: 6 }, '031': { price: 25.00, days: 6 }, '032': { price: 26.00, days: 7 },
        '033': { price: 27.00, days: 7 }, '034': { price: 28.00, days: 7 }, '035': { price: 30.00, days: 7 },
        '036': { price: 32.00, days: 7 }, '037': { price: 34.00, days: 7 },

        '040': { price: 32.00, days: 7 }, '041': { price: 34.00, days: 7 }, '042': { price: 35.00, days: 7 },
        '043': { price: 36.00, days: 7 }, '044': { price: 38.00, days: 7 }, '045': { price: 40.00, days: 7 },
        '046': { price: 42.00, days: 7 }, '047': { price: 45.00, days: 7 },

        '050': { price: 30.00, days: 7 }, '051': { price: 32.00, days: 7 }, '052': { price: 33.00, days: 7 },
        '053': { price: 35.00, days: 7 }, '054': { price: 36.00, days: 7 }, '055': { price: 38.00, days: 7 },
        '056': { price: 40.00, days: 7 }, '057': { price: 42.00, days: 7 },

        '060': { price: 42.00, days: 7 }, '061': { price: 46.00, days: 7 }, '062': { price: 50.00, days: 7 },

        '070': { price: 25.00, days: 6 }, '071': { price: 28.00, days: 7 },

        '074': { price: 40.00, days: 7 }, '075': { price: 45.00, days: 7 }, '076': { price: 50.00, days: 7 }
    },

    calculate(cep) {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length < 3) throw new Error('CEP inválido.');

        const prefix = cleanCep.substring(0, 3);
        const rate = this.rates[prefix];

        if (!rate) {
            throw new Error('Frete não disponível para esta região.');
        }

        return { ...rate, region: 'São Paulo/SP' };
    },

    async validateCep(cep) {
        console.log('Consultando ViaCEP para:', cep); // Log para debug
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error(`Erro na requisição: ${response.statusText}`);
            
            const data = await response.json();
            
            if (data.erro) throw new Error('CEP não encontrado.');
            
            // Validação extra: Conferir se o campo UF é 'SP'
            if (data.uf !== 'SP') {
                throw new Error('Desculpe, entregamos apenas no estado de São Paulo.');
            }
            
            return data;
        } catch (error) {
            console.error("Erro na validação de CEP:", error);
            throw new Error('Falha ao validar CEP. Tente novamente.');
        }
    }
};
