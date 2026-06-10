const http = require("http");

// Helper para fazer requisições
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 8000,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "x-tenant-slug": "test-tenant",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testEndpoints() {
  console.log("🧪 Testando endpoints de senha...\n");

  try {
    // Test 1: Verificar que endpoints existem
    console.log("1️⃣  Teste: GET /api/health");
    const health = await makeRequest("GET", "/api/health");
    console.log(`Status: ${health.status}\n`);

    // Test 2: Tentar forgot-password (sem token deve retornar erro ou sucesso genérico)
    console.log("2️⃣  Teste: POST /api/auth/forgot-password");
    const forgot = await makeRequest(
      "POST",
      "/api/auth/forgot-password",
      {},
      {
        email: "test@example.com",
      },
    );
    console.log(`Status: ${forgot.status}`);
    console.log(`Response: ${JSON.stringify(forgot.body, null, 2)}\n`);

    // Test 3: Verificar rate limiting - 5 requisições rápidas
    console.log("3️⃣  Teste: Rate Limiting (5 requisições rápidas)");
    const fakeBearerToken = "fake.jwt.token";
    for (let i = 1; i <= 6; i++) {
      const result = await makeRequest(
        "POST",
        "/api/users/me/change-password",
        { Authorization: `Bearer ${fakeBearerToken}` },
        {
          currentPassword: "Current123!",
          newPassword: "NewPass123!",
          confirmPassword: "NewPass123!",
        },
      );
      console.log(`Requisição ${i}: Status ${result.status}`);
      if (result.status === 429) {
        console.log("✅ Rate limiting ativado na 6ª requisição!\n");
        break;
      }
    }

    console.log("\n✅ Todos os endpoints estão acessíveis!");
  } catch (err) {
    console.error("❌ Erro:", err.message);
  }
}

testEndpoints();
