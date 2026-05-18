-- ============================================================
-- FUNÇÃO 1: Excluir produção com rollback de filamentos
-- Funciona para peças "em_producao" e "finalizado"
-- ============================================================
CREATE OR REPLACE FUNCTION delete_production(p_production_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prod  record;
  v_usage record;
BEGIN
  SELECT * INTO v_prod FROM production_items WHERE id = p_production_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Se já foi finalizada: filamentos foram descontados → devolver ao estoque
  IF v_prod.status = 'finalizado' THEN
    FOR v_usage IN (
      SELECT filament_id, grams
      FROM production_filament_usage
      WHERE production_item_id = p_production_id AND filament_id IS NOT NULL
    ) LOOP
      UPDATE filaments SET grams = grams + v_usage.grams WHERE id = v_usage.filament_id;
    END LOOP;
    -- Remove o item do estoque que foi gerado por essa produção
    DELETE FROM stock_items WHERE production_item_id = p_production_id;
  END IF;
  -- Se em_producao: filamentos ainda NÃO foram descontados → só deleta registros

  DELETE FROM production_filament_usage WHERE production_item_id = p_production_id;
  DELETE FROM production_items WHERE id = p_production_id;
END;
$$;

-- ============================================================
-- FUNÇÃO 2: Excluir item do estoque com rollback de filamentos
-- Devolve filamentos usados na produção que gerou esse item
-- ============================================================
CREATE OR REPLACE FUNCTION delete_stock_item(p_stock_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stock record;
  v_usage record;
BEGIN
  SELECT * INTO v_stock FROM stock_items WHERE id = p_stock_item_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Devolve filamentos se houver produção vinculada
  IF v_stock.production_item_id IS NOT NULL THEN
    FOR v_usage IN (
      SELECT filament_id, grams
      FROM production_filament_usage
      WHERE production_item_id = v_stock.production_item_id AND filament_id IS NOT NULL
    ) LOOP
      UPDATE filaments SET grams = grams + v_usage.grams WHERE id = v_usage.filament_id;
    END LOOP;
  END IF;

  DELETE FROM stock_items WHERE id = p_stock_item_id;
END;
$$;

-- ============================================================
-- FUNÇÃO 3: Excluir venda com rollback de estoque e financeiro
-- Devolve a quantidade ao estoque e remove a transação gerada
-- ============================================================
CREATE OR REPLACE FUNCTION delete_sale(p_sale_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sale record;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Devolve quantidade ao estoque se a venda estava vinculada
  IF v_sale.stock_item_id IS NOT NULL THEN
    UPDATE stock_items
    SET quantity = quantity + v_sale.quantity
    WHERE id = v_sale.stock_item_id;
  END IF;

  -- Remove a transação financeira gerada pela venda
  DELETE FROM transactions WHERE sale_id = p_sale_id;

  DELETE FROM sales WHERE id = p_sale_id;
END;
$$;

-- Concede permissão às funções para usuários autenticados
GRANT EXECUTE ON FUNCTION delete_production  TO authenticated;
GRANT EXECUTE ON FUNCTION delete_stock_item  TO authenticated;
GRANT EXECUTE ON FUNCTION delete_sale        TO authenticated;
