// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { generateImage, analyzeImageAlt } from "./gemini-image";
import { resolveImageConfig } from "../image-config";
const config=resolveImageConfig({GEMINI_API_KEY:"secret"});
const png=await sharp({create:{width:2,height:2,channels:3,background:"white"}}).png().toBuffer();
const part={inlineData:{mimeType:"image/png",data:png.toString("base64")}};
const reply=(parts:unknown[],usageMetadata?:unknown)=>new Response(JSON.stringify({candidates:[{content:{parts}}],usageMetadata}));
describe("Gemini image provider",()=>{
 it("sends native configuration and skips thought images while counting image and thinking tokens",async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(reply([{thought:true,inlineData:{mimeType:"image/png",data:"bad"}},part],{promptTokenCount:10,candidatesTokenCount:747,thoughtsTokenCount:20,totalTokenCount:777,candidatesTokensDetails:[{modality:"IMAGE",tokenCount:747}]}));
  const result=await generateImage({config,prompt:"Draw",fetcher});
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string).generationConfig).toEqual({responseModalities:["TEXT","IMAGE"],responseFormat:{image:{imageSize:"IMAGE_SIZE_FIVE_TWELVE",aspectRatio:"ASPECT_RATIO_NINE_BY_SIXTEEN"}}});
  expect(result.bytes.equals(png)).toBe(true);
  expect(result.usage).toEqual({inputTokens:10,outputTokens:767,totalTokens:777,imageOutputTokens:747});
 });
 it.each([[],[{text:"refused"}],[part,part],[{inlineData:{mimeType:"image/png",data:Buffer.from("fake").toString("base64")}}],[{inlineData:{mimeType:"image/jpeg",data:png.toString("base64")}}]].map(parts => [parts]))("rejects missing, ambiguous or invalid images",async(parts)=>{
  await expect(generateImage({config,prompt:"Draw",fetcher:vi.fn().mockResolvedValue(reply(parts))})).rejects.toMatchObject({category:"invalid_output"});
 });
 it.each([[401,"authentication"],[429,"rate_limit"],[500,"upstream"]])("sanitizes HTTP %s",async(status,category)=>{
  await expect(generateImage({config,prompt:"Draw",fetcher:vi.fn().mockResolvedValue(new Response("secret",{status:status as number}))})).rejects.toMatchObject({category});
 });
 it("marks network outcomes unknown without retries or secret text",async()=>{
  const fetcher=vi.fn().mockRejectedValue(new Error("secret"));
  await expect(generateImage({config,prompt:"Draw",fetcher})).rejects.toMatchObject({category:"upstream",generationStatusUnknown:true});
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it("rejects oversized images before decoding",async()=>{
  const data=Buffer.alloc(20*1024*1024+1).toString("base64");
  await expect(generateImage({config,prompt:"Draw",fetcher:vi.fn().mockResolvedValue(reply([{inlineData:{mimeType:"image/png",data}}]))})).rejects.toMatchObject({category:"output_limit"});
 });
 it("marks timeout status unknown",async()=>{
  await expect(generateImage({config,prompt:"Draw",fetcher:vi.fn().mockRejectedValue(new DOMException("secret","TimeoutError"))})).rejects.toMatchObject({category:"timeout",generationStatusUnknown:true});
 });
 it("checks alt against actual image using structured output",async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(reply([{text:'{"alt":"品牌資訊來源示意圖"}'}]));
  const result = await analyzeImageAlt({config,prompt:"Describe",bytes:png,mimeType:"image/png",fetcher});
  expect(result.alt).toBe("品牌資訊來源示意圖");
  expect(result.usage).toHaveProperty("imageOutputTokens", 0);
  const body=JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  expect(body.contents[0].parts[1]).toEqual(part);
 });
 it("rejects empty or long alt",async()=>{
  for(const alt of [" ","a".repeat(501)]) await expect(analyzeImageAlt({config,prompt:"Describe",bytes:png,mimeType:"image/png",fetcher:vi.fn().mockResolvedValue(reply([{text:JSON.stringify({alt})}]))})).rejects.toMatchObject({category:"invalid_output"});
 });
});
