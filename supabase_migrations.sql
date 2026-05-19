-- ============================================================
-- FUNÇÕES ANTERIORES (mantidas)
-- Rodar novamente garante a versão mais recente
-- ============================================================

CREATE OR REPLACE FUNCTION delete_production(p_production_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_prod record; v_usage record;
BEGIN
  SELECT * INTO v_prod FROM production_items WHERE id = p_production_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_prod.status = 'finalizado' THEN
    FOR v_usage IN (SELECT filament_id, grams FROM production_filament_usage WHERE production_item_id = p_production_id AND filament_id IS NOT NULL) LOOP
      UPDATE filaments SET grams = grams + v_usage.grams WHERE id = v_usage.filament_id;
    END LOOP;
    DELETE FROM stock_items WHERE production_item_id = p_production_id;
  END IF;
  DELETE FROM production_filament_usage WHERE production_item_id = p_production_id;
  DELETE FROM production_items WHERE id = p_production_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_stock_item(p_stock_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_stock record; v_usage record;
BEGIN
  SELECT * INTO v_stock FROM stock_items WHERE id = p_stock_item_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_stock.production_item_id IS NOT NULL THEN
    FOR v_usage IN (SELECT filament_id, grams FROM production_filament_usage WHERE production_item_id = v_stock.production_item_id AND filament_id IS NOT NULL) LOOP
      UPDATE filaments SET grams = grams + v_usage.grams WHERE id = v_usage.filament_id;
    END LOOP;
  END IF;
  DELETE FROM stock_items WHERE id = p_stock_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_sale(p_sale_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sale record;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_sale.stock_item_id IS NOT NULL THEN
    UPDATE stock_items SET quantity = quantity + v_sale.quantity WHERE id = v_sale.stock_item_id;
  END IF;
  DELETE FROM transactions WHERE sale_id = p_sale_id;
  DELETE FROM sales WHERE id = p_sale_id;
END;
$$;

-- ============================================================
-- FUNÇÃO 4 (NOVA): Excluir CADEIA COMPLETA a partir da produção
-- Cascata: produção → estoque → vendas → transações
-- Restaura filamentos automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION delete_full_chain(p_production_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prod       record;
  v_stock_id   uuid;
  v_usage      record;
  v_sales_del  int := 0;
BEGIN
  SELECT * INTO v_prod FROM production_items WHERE id = p_production_id;
  IF NOT FOUND THEN RETURN '{"ok":false}'::json; END IF;

  -- Encontra o item de estoque gerado por essa produção
  SELECT id INTO v_stock_id FROM stock_items WHERE production_item_id = p_production_id LIMIT 1;

  IF v_stock_id IS NOT NULL THEN
    -- Conta e remove as vendas (e suas transações financeiras)
    SELECT COUNT(*) INTO v_sales_del FROM sales WHERE stock_item_id = v_stock_id;
    DELETE FROM transactions WHERE sale_id IN (SELECT id FROM sales WHERE stock_item_id = v_stock_id);
    DELETE FROM sales WHERE stock_item_id = v_stock_id;
    -- Remove o item do estoque
    DELETE FROM stock_items WHERE id = v_stock_id;
  END IF;

  -- Restaura filamentos (produção foi finalizada → filamentos foram consumidos)
  IF v_prod.status = 'finalizado' THEN
    FOR v_usage IN (
      SELECT filament_id, grams FROM production_filament_usage
      WHERE production_item_id = p_production_id AND filament_id IS NOT NULL
    ) LOOP
      UPDATE filaments SET grams = grams + v_usage.grams WHERE id = v_usage.filament_id;
    END LOOP;
  END IF;

  DELETE FROM production_filament_usage WHERE production_item_id = p_production_id;
  DELETE FROM production_items WHERE id = p_production_id;

  RETURN json_build_object('ok', true, 'vendas_removidas', v_sales_del, 'tinha_estoque', v_stock_id IS NOT NULL);
END;
$$;

-- ============================================================
-- FUNÇÃO 5 (NOVA): Excluir CADEIA COMPLETA a partir do estoque
-- Cascata: estoque → produção (histórico) → vendas → transações
-- Restaura filamentos automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION delete_stock_full(p_stock_item_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stock      record;
  v_usage      record;
  v_sales_del  int := 0;
BEGIN
  SELECT * INTO v_stock FROM stock_items WHERE id = p_stock_item_id;
  IF NOT FOUND THEN RETURN '{"ok":false}'::json; END IF;

  -- Remove vendas e transações financeiras vinculadas
  SELECT COUNT(*) INTO v_sales_del FROM sales WHERE stock_item_id = p_stock_item_id;
  DELETE FROM transactions WHERE sale_id IN (SELECT id FROM sales WHERE stock_item_id = p_stock_item_id);
  DELETE FROM sales WHERE stock_item_id = p_stock_item_id;

  -- Remove o item do estoque
  DELETE FROM stock_items WHERE id = p_stock_item_id;

  -- Remove o histórico de produção vinculado + restaura filamentos
  IF v_stock.production_item_id IS NOT NULL THEN
    FOR v_usage IN (
      SELECT filament_id, grams FROM production_filament_usage
      WHERE production_item_id = v_stock.production_item_id AND filament_id IS NOT NULL
    ) LOOP
      UPDATE filaments SET grams = grams + v_usage.grams WHERE id = v_usage.filament_id;
    END LOOP;
    DELETE FROM production_filament_usage WHERE production_item_id = v_stock.production_item_id;
    DELETE FROM production_items WHERE id = v_stock.production_item_id;
  END IF;

  RETURN json_build_object('ok', true, 'vendas_removidas', v_sales_del);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION delete_production   TO authenticated;
GRANT EXECUTE ON FUNCTION delete_stock_item   TO authenticated;
GRANT EXECUTE ON FUNCTION delete_sale         TO authenticated;
GRANT EXECUTE ON FUNCTION delete_full_chain   TO authenticated;
GRANT EXECUTE ON FUNCTION delete_stock_full   TO authenticated;

-- ============================================================
-- CORREÇÕES DE CONSTRAINTS
-- ============================================================
ALTER TABLE filaments ALTER COLUMN supplier_id DROP NOT NULL;
ALTER TABLE sales ALTER COLUMN stock_item_id DROP NOT NULL;
ALTER TABLE production_items ALTER COLUMN customer_id DROP NOT NULL;

-- ============================================================
-- LOTE DE PRODUÇÃO (NOVA ATUALIZAÇÃO)
-- ============================================================
-- 1. Adiciona coluna quantity na tabela production_items
ALTER TABLE production_items ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;

-- 2. Atualiza a RPC finalize_production para suportar a quantidade e unitarizar os custos no estoque
CREATE OR REPLACE FUNCTION finalize_production(p_production_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prod record;
  v_usage record;
BEGIN
  -- Busca a produção correspondente
  SELECT * INTO v_prod FROM production_items WHERE id = p_production_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produção não encontrada: %', p_production_id;
  END IF;
  
  IF v_prod.status = 'finalizado' THEN
    RETURN;
  END IF;

  -- Atualiza o status da produção para finalizado
  UPDATE production_items 
  SET status = 'finalizado', end_date = NOW() 
  WHERE id = p_production_id;

  -- Deduz os filamentos do estoque de filamentos
  FOR v_usage IN (
    SELECT filament_id, grams 
    FROM production_filament_usage 
    WHERE production_item_id = p_production_id AND filament_id IS NOT NULL
  ) LOOP
    UPDATE filaments 
    SET grams = grams - v_usage.grams 
    WHERE id = v_usage.filament_id;
  END LOOP;

  -- Insere no estoque com a quantidade correta e custos/horas unitarizados
  INSERT INTO stock_items (
    id,
    name,
    quantity,
    filament_grams,
    estimated_hours,
    production_cost,
    suggested_price,
    production_item_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_prod.name,
    COALESCE(v_prod.quantity, 1),
    -- Divide os totais da produção pela quantidade para obter valores unitários no estoque
    ROUND((v_prod.filament_grams_total::numeric / COALESCE(v_prod.quantity, 1)::numeric), 1),
    ROUND((v_prod.estimated_hours::numeric / COALESCE(v_prod.quantity, 1)::numeric), 2),
    ROUND((v_prod.production_cost::numeric / COALESCE(v_prod.quantity, 1)::numeric), 2),
    ROUND((v_prod.suggested_price::numeric / COALESCE(v_prod.quantity, 1)::numeric), 2),
    p_production_id,
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_production TO authenticated;

