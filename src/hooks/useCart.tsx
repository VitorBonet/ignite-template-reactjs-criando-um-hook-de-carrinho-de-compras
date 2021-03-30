import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const ProductIndex = cart.findIndex(product => product.id === productId);
      
      if(ProductIndex >= 0){
        const stockProduct = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);
        if(cart[ProductIndex].amount+1 > stockProduct.amount){
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        const newProduct = cart[ProductIndex];
        newProduct.amount += 1;
        const cardFiltered = cart.filter(product => product.id !== productId);

        setCart([...cardFiltered, newProduct]);
        localStorage.setItem('@RocketShoes:cart',JSON.stringify([...cardFiltered, newProduct]));
        
      }else{
        /*add item no carrinho */
        const product = await api.get<Product>(`/products/${productId}`).then(response => response.data);

        product.amount = 1;
        const newCart = [...cart, product];
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart',JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProductIndex = cart.findIndex(product => product.id === productId);
      if(findProductIndex < 0){
        toast.error('Erro na remoção do produto');
        return;
      }

      const activeItens = cart.filter(product => product.id !== productId)
      setCart(activeItens);
      localStorage.setItem('@RocketShoes:cart',JSON.stringify(activeItens));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if( amount < 1) return
      
      const productDataStock:Stock = await (await api.get(`stock/${productId}`)).data
      
      if(amount > productDataStock.amount) return toast.error('Quantidade solicitada fora de estoque');
      
      const cardFilred = cart.map(product => {
        if(product.id === productId) {
          product.amount = amount
        }
        return product
      })

      setCart([...cardFilred]);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cardFilred]))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
