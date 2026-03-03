import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

const CBR_URL = "https://www.cbr.ru/DailyInfoWebServ/DailyInfo.asmx";

const parser = new XMLParser({
	ignoreAttributes: false,
	removeNSPrefix: true,
});

const rateSchema = z.preprocess((value) => {
	if (typeof value === "number") return value;
	if (typeof value === "string") return Number(value.replace(",", "."));
	return value;
}, z.number());

const krRowSchema = z.object({
	DT: z
		.string()
		.min(1)
		.transform((value) => dayjs(value))
		.refine((value) => value.isValid(), "Invalid DT date"),
	Rate: rateSchema,
});

const soapResponseSchema = z.object({
	Envelope: z.object({
		Body: z.object({
			KeyRateResponse: z.object({
				KeyRateResult: z.object({
					diffgram: z.object({
						KeyRate: z.object({
							KR: z.union([krRowSchema, z.array(krRowSchema)]),
						}),
					}),
				}),
			}),
		}),
	}),
});

export async function getCurrentKeyRate(): Promise<number> {
	const to = dayjs();
	const from = to.subtract(3, "months");

	const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <KeyRate xmlns="http://web.cbr.ru/">
      <fromDate>${from.toISOString()}</fromDate>
      <ToDate>${to.toISOString()}</ToDate>
    </KeyRate>
  </soap:Body>
</soap:Envelope>`;

	const response = await fetch(CBR_URL, {
		method: "POST",
		headers: {
			"Content-Type": "text/xml; charset=utf-8",
			SOAPAction: '"http://web.cbr.ru/KeyRate"',
		},
		body: soapBody,
	});

	if (!response.ok) {
		throw new Error(`CBR HTTP error: ${response.status}`);
	}

	const xmlText = await response.text();
	const parsedXml = parser.parse(xmlText);
	const validated = soapResponseSchema.parse(parsedXml);
	const krNode =
		validated.Envelope.Body.KeyRateResponse.KeyRateResult.diffgram.KeyRate.KR;
	const rows = Array.isArray(krNode) ? krNode : [krNode];

	if (rows.length === 0) {
		throw new Error("No key rate data in CBR response");
	}

	rows.sort((a, b) => a.DT.valueOf() - b.DT.valueOf());
	const latestRow = rows[rows.length - 1];

	return latestRow.Rate;
}
