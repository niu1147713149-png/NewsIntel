import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

async function createUserViaApi(request: APIRequestContext, email: string, name: string): Promise<void> {
  const response = await request.post("http://localhost:8000/api/v1/auth/register", {
    data: {
      email,
      password: "StrongPass123",
      name
    }
  });

  expect(response.ok()).toBeTruthy();
}

async function createAlertViaApi(request: APIRequestContext, stockId: number, threshold: string): Promise<void> {
  const response = await request.post("http://localhost:8000/api/v1/alerts", {
    data: {
      stock_id: stockId,
      operator: "above",
      threshold: Number(threshold)
    }
  });

  expect(response.ok()).toBeTruthy();
}

async function loginFromUi(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("StrongPass123");
  const loginResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/v1/auth/login") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "登录" }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "退出" })).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
}

test("supports ticker and filtered bulk-read notification actions", async ({ page, request }) => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const email = `e2e-alert-${unique}@example.com`;
  const name = `Alert ${unique}`;

  await createUserViaApi(request, email, name);
  await loginFromUi(page, email);
  await createAlertViaApi(page.request, 1, "100.00");
  await createAlertViaApi(page.request, 2, "100.00");

  const evaluateResponse = await page.request.post("http://localhost:8000/api/v1/alerts/evaluate");
  expect(evaluateResponse.ok()).toBeTruthy();

  await page.goto("/notifications?scope=unread");
  await expect(page.getByRole("heading", { name: "通知中心" })).toBeVisible();
  await expect(page.getByText("AAPL", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("NVDA", { exact: true }).first()).toBeVisible();

  const readTickerResponse = await page.request.post("http://localhost:8000/api/v1/alerts/notifications/read-by-ticker?ticker=AAPL");
  expect(readTickerResponse.ok()).toBeTruthy();

  await page.goto("/notifications?scope=unread");
  await expect(page.getByText("NVDA", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("AAPL", { exact: true })).toHaveCount(0);

  await page.goto("/notifications?scope=unread&ticker=NVDA");
  await expect(page).toHaveURL(/ticker=NVDA/);

  const readFilteredResponse = await page.request.post(
    "http://localhost:8000/api/v1/alerts/notifications/read-filtered?scope=unread&sort=newest&ticker=NVDA"
  );
  expect(readFilteredResponse.ok()).toBeTruthy();

  await page.goto("/notifications?scope=unread");
  await expect(page.getByRole("heading", { name: "暂无通知" })).toBeVisible();

  await page.goto("/notifications?scope=all");
  await expect(page.getByText("AAPL", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("NVDA", { exact: true }).first()).toBeVisible();
});

test("evaluates alerts from the alerts page and jumps to unread notifications", async ({ page, request }) => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const email = `e2e-evaluate-${unique}@example.com`;
  const name = `Evaluate ${unique}`;

  await createUserViaApi(request, email, name);
  await loginFromUi(page, email);
  await createAlertViaApi(page.request, 1, "100.00");

  await page.goto("/alerts");
  await expect(page.getByRole("button", { name: "立即评估告警" })).toBeVisible();

  const evaluateResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/v1/alerts/evaluate") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "立即评估告警" }).click();
  const evaluateResponse = await evaluateResponsePromise;
  expect(evaluateResponse.ok()).toBeTruthy();

  await expect(page.getByText("已完成评估，当前共有 1 条已触发通知。")).toBeVisible();
  const unreadLink = page.getByRole("link", { name: "去通知中心查看未读通知" });
  await expect(unreadLink).toHaveAttribute("href", "/notifications?scope=unread");
  await page.goto("/notifications?scope=unread");

  await expect(page).toHaveURL(/\/notifications\?scope=unread$/);
  await expect(page.getByRole("heading", { name: "通知中心" })).toBeVisible();
  await expect(page.getByText("AAPL", { exact: true }).first()).toBeVisible();
});
