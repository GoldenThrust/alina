import { del, get, post, put } from "../../api/auth";

/* =====================================================================
 * Products  —  /products  (public read, admin write)
 * ===================================================================== */
 
export const listProducts = (params?: ListProductsParams) =>
  get<Paginated<Product>>("/products", params);
export const getProduct = (id: ID) => get<Product>(`/products/${id}`);
export const createProduct = (body: CreateProductBody) => post<Product>("/products", body);
export const updateProduct = (id: ID, body: UpdateProductBody) =>
  put<Product>(`/products/${id}`, body);
export const deleteProduct = (id: ID) => del(`/products/${id}`);
 