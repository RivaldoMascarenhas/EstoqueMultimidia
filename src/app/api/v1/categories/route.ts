import { NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";

export async function GET() {
  try {
    const categories = await InventoryService.getCategories();
    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar categorias." },
      { status: 500 }
    );
  }
}
