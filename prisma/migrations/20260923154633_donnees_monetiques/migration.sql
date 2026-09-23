-- CreateTable
CREATE TABLE "Remise" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(10) NOT NULL,
    "siren" CHAR(9) NOT NULL,
    "dateTraitement" DATE NOT NULL,
    "devise" CHAR(3) NOT NULL DEFAULT 'EUR',

    CONSTRAINT "Remise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "remiseId" INTEGER NOT NULL,
    "dateVente" TIMESTAMP(3) NOT NULL,
    "numeroCarte" CHAR(16) NOT NULL,
    "reseau" CHAR(2) NOT NULL,
    "numeroAutorisation" CHAR(6) NOT NULL,
    "devise" CHAR(3) NOT NULL DEFAULT 'EUR',
    "montant" DECIMAL(7,2) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Impaye" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "numeroDossier" CHAR(5) NOT NULL,
    "motifCode" CHAR(2) NOT NULL,

    CONSTRAINT "Impaye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotifImpaye" (
    "code" CHAR(2) NOT NULL,
    "libelle" VARCHAR(60) NOT NULL,

    CONSTRAINT "MotifImpaye_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "Remise_numero_key" ON "Remise"("numero");

-- CreateIndex
CREATE INDEX "Remise_siren_dateTraitement_idx" ON "Remise"("siren", "dateTraitement");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_numeroAutorisation_key" ON "Transaction"("numeroAutorisation");

-- CreateIndex
CREATE UNIQUE INDEX "Impaye_transactionId_key" ON "Impaye"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Impaye_numeroDossier_key" ON "Impaye"("numeroDossier");

-- AddForeignKey
ALTER TABLE "Remise" ADD CONSTRAINT "Remise_siren_fkey" FOREIGN KEY ("siren") REFERENCES "Entreprise"("siren") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_remiseId_fkey" FOREIGN KEY ("remiseId") REFERENCES "Remise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impaye" ADD CONSTRAINT "Impaye_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impaye" ADD CONSTRAINT "Impaye_motifCode_fkey" FOREIGN KEY ("motifCode") REFERENCES "MotifImpaye"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
