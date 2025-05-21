
'use server';
/**
 * @fileOverview Utility functions related to Fourier Transform.
 * This file provides an implementation for the Discrete Fourier Transform (DFT).
 */

export interface DFTResult {
  frequencyIndex: number; // k, the index of the frequency bin
  realPart: number;       // Real part of X_k
  imaginaryPart: number;  // Imaginary part of X_k
  magnitude: number;      // Magnitude |X_k| = sqrt(real² + imag²)
  phase: number;          // Phase arg(X_k) = atan2(imag, real)
  // The actual frequency this bin represents is (k * sampling_rate) / N.
  // For simplicity, we'll use frequencyIndex in charts.
}

/**
 * Calculates the Discrete Fourier Transform (DFT) of a data series.
 *
 * The DFT transforms a finite sequence of N equally-spaced samples x_n
 * into a sequence of N complex numbers X_k (frequency components).
 * Formula: X_k = Σ_{n=0}^{N-1} x_n * e^(-i * 2π * k * n / N)
 *
 * For real-valued input x_n, the output X_k is conjugate symmetric (X_k = conj(X_{N-k})).
 * Thus, only the first N/2 + 1 components are typically unique and analyzed for magnitude.
 *
 * @param data An array of numbers representing the time-domain signal (e.g., sensor readings).
 * @returns An array of DFTResult objects, each representing a frequency component.
 *          Returns results for k = 0 to N/2.
 */
export async function calculateDFT(data: number[]): Promise<DFTResult[]> {
  const N = data.length;
  const results: DFTResult[] = [];

  if (N === 0) {
    return results;
  }

  // Iterate up to N/2 since the spectrum is symmetric for real inputs
  for (let k = 0; k <= N / 2; k++) {
    let sumReal = 0;
    let sumImag = 0;

    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      sumReal += data[n] * Math.cos(angle);
      sumImag -= data[n] * Math.sin(angle); // Subtract because e^(-iθ) = cos(θ) - i*sin(θ)
    }

    const magnitude = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
    const phase = Math.atan2(sumImag, sumReal);

    results.push({
      frequencyIndex: k,
      realPart: sumReal,
      imaginaryPart: sumImag,
      magnitude: magnitude,
      phase: phase,
    });
  }

  return results;
}

